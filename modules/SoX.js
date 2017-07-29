var path = require('path'),
    command_list = require(path.join(__dirname, '../commands.json')),
    config = require(path.join(__dirname, '../auth.json')),
    exec = require('child_process').exec,
    ytdl = require('ytdl-core'),
    got = require('got'),
    moment = require('moment'),
    fs = require('fs');

require("moment-duration-format");

var SoxModule = function()
{
    this.queues = {};
    this.default_gain = 50;
    this.default_bass = 15;
};

function toMMSS(num)
{
    var sec_num = parseInt(num, 10); // don't forget the second param
    var minutes   = Math.floor(sec_num / 60);
    var seconds = sec_num - (minutes * 60);

    if (minutes < 10) minutes = '0' + minutes;
    if (seconds < 10) seconds = '0' + seconds;
    return minutes + ':' + seconds;
}

function promise_from_child_process(child)
{
    return new Promise(function (resolve, reject) {
        child.addListener('error', reject);
        child.addListener('exit', resolve);
    });
}

SoxModule.prototype.get_youtube_id = async function(args)
{
    const yt_regex = /(?:youtube\.com\/\S*(?:(?:\/e(?:mbed))?\/|watch\/?\?(?:\S*?&?v\=))|youtu\.be\/)([a-zA-Z0-9_-]{6,11})/g;
    var ex = yt_regex.exec(args);
    var id = ex ? ex[1] : null;
    if (!id)
    {
        var response = await got(`https://www.googleapis.com/youtube/v3/search?type=video&q=${encodeURIComponent(args.join(' '))}&safeSearch=none&maxResults=1&part=id&key=${config.yt_key}`.replace('%20', '+'));
        var { items } = JSON.parse(response.body);

        id = items[0].id.videoId;
    }

    var response = await got(`https://www.googleapis.com/youtube/v3/videos?id=${id}&part=snippet,contentDetails&key=${config.yt_key}`);
    var title = JSON.parse(response.body).items[0].snippet.title;
    var duration = moment.duration(JSON.parse(response.body).items[0].contentDetails.duration);

    return [id, title, duration];
}

SoxModule.prototype.do_effect = async function(mode, filename, args)
{
    let output_filename;
    switch (mode)
    {
        case 'v':
            output_filename = `./downloads/${filename}_v.mp3`;

            // If the file has already been processed, no need to redo it.
            if (!fs.existsSync(output_filename))
                await promise_from_child_process(exec(`sox "./downloads/${filename}.mp3" "${output_filename}" tempo 0.6 pitch -500`));

            break;
        
        case 'e':
            args[0] = parseInt(args[0], 10);
            args[1] = parseInt(args[1], 10);

            let gain = (args[0] && Number.isInteger(args[0]) && args[0] >= 0 && args[0] <= 500) ? args[0] : this.default_gain;
            let bass = (args[1] && Number.isInteger(args[1]) && args[1] >= 0 && args[1] <= 500) ? args[1] : this.default_bass;

            output_filename = `./downloads/${filename}_e_${args[0]}_${args[1]}.mp3`;

            if (!fs.existsSync(output_filename))
                await promise_from_child_process(exec(`sox "./downloads/${filename}.mp3" "${output_filename}" gain ${gain} bass ${bass}`));

            break;
    }
    return output_filename;
};

SoxModule.prototype.to_mp3 = async function(filename)
{
    var input_filename = path.join(__dirname, '..', 'downloads', filename);
    await promise_from_child_process(exec(`ffmpeg -y -i "${input_filename}" "${input_filename}.mp3"`));
    
    // We can delete the source file once it's converted
    fs.unlinkSync(input_filename);
};

SoxModule.prototype.youtube_dl = function(url)
{
    return new Promise((resolve, reject) =>
    {
        try
        {
            var output_name = url.substr(url.length - 11);

            ytdl(url, {
                filter: 'audioonly'
            })
            .on('progress', function(c, downloaded, total) {
                if (downloaded >= total)
                {
                    resolve();
                }
            })
            .pipe(
                fs.createWriteStream(
                    path.join(
                        __dirname,
                        '..',
                        'downloads',
                        output_name
                    )
                )
            );
        }
        catch (error)
        {
            reject(error);
        }
    });
}

SoxModule.prototype.add_to_queue = async function(message, command, args)
{
    var progress_message = await message.channel.send({
        embed:
        {
            title: 'Downloading...',
            description: '(0/3)',
            color: config.embed_color
        }
    });

    if (args.length > 2 && Number.isInteger(args[args.length - 1]) && Number.isInteger(args[args.length - 2]))
    {
        var db = args.splice(args.length - 2);
    }
    else
    {
        var db = [this.default_gain, this.default_bass];
    }

    let video_info = await this.get_youtube_id(args);
    if (video_info[2].get('hours') >= 1)
    {
        await message.channel.send({
            embed:
            {
                title: 'Won\'t Download Video',
                description: 'Video must be under 60 minutes in duration.',
                color: config.embed_color
            }
        });
        throw new Error('Video must be under 60 minutes in duration.');
    }

    let output_name = video_info[0];
    
    // No need to re-download and re-convert MP3s that we already have
    if (!fs.existsSync(path.join(__dirname, '..', 'downloads', `${output_name}.mp3`)))
    {
        await this.youtube_dl('https://youtu.be/' + video_info[0]);

        await progress_message.edit({
            embed:
            {
                title: 'Converting...',
                description: '(1/3)',
                color: config.embed_color
            }
        });

        await this.to_mp3(output_name);
    }

    await progress_message.edit({
        embed:
        {
            title: 'Processing...',
            description: '(2/3)',
            color: config.embed_color
        }
    });

    let output_path;
    let type;

    if (command === 'earrape')
    {
        output_path = await this.do_effect('e', output_name, db);
        type = ':loudspeaker:';
    }
    else if (command === 'vapor' || command === 'vapour')
    {
        output_path = await this.do_effect('v', output_name, args.slice(1));
        type = ':foggy:';
    }
    else if (command === 'play')
    {
        output_path = `./downloads/${output_name}.mp3`;
        type = ':arrow_forward:';
    }

    await progress_message.edit({
        embed:
        {
            title: 'Done! Added to queue.',
            description: '(3/3)',
            color: config.embed_color
        }
    });

    if (this.queues[message.guild.id] === undefined)
        this.queues[message.guild.id] = [];

    // Place the song into the queue
    this.queues[message.guild.id].push({
        url: 'https://youtu.be/' + video_info[0],
        file: output_path,
        title: video_info[1],
        duration: video_info[2],
        type: type,
        requester:
        {
            nickname: message.member.displayName,
            discrim: message.author.discriminator,
            channel: message.channel
        }
    });
}

SoxModule.prototype.progress_queue = async function(message)
{
    let connection = message.guild.voiceConnection;
    
    if (connection.dispatcher)
        connection.dispatcher.end('progress_queue');

    // Remove first song from queue
    this.queues[message.guild.id].splice(0, 1);

    if (this.queues[message.guild.id].length === 0)
    {
        message.channel.send({
            embed:
            {
                title: 'Finished Song Queue',
                description: '*There are no more songs in the queue.*',
                color: config.embed_color
            }
        });
        connection.disconnect();
    }
    else
    {
        this.queues[message.guild.id][0].start_time = new Date().getTime()/1000;
        await connection.playFile(this.queues[message.guild.id][0].file)
        .on('end', reason => {
            if (reason !== 'progress_queue' && reason !== 'left_channel')
            {
                this.progress_queue(message);
            }
        });
        
        message.channel.send({
            embed:
            {
                title: 'Now Playing',
                description: `${this.queues[message.guild.id][0].type} \`${this.queues[message.guild.id][0].title}\` (\`${this.queues[message.guild.id][0].url}\`) (Requested by **${this.queues[message.guild.id][0].requester.nickname}#${this.queues[message.guild.id][0].requester.discrim}**)`,
                color: config.embed_color
            }
        });
    }
};

SoxModule.prototype.start_queue = async function(message)
{
    if (message.member.voiceChannel)
    {
        try
        {
            var connection = await message.member.voiceChannel.join();
        }
        catch (error)
        {
            await message.channel.send({
                embed:
                {
                    title: 'Couldn\'t join voice channel',
                    description: 'Make sure that it is one that I can access, and that I have permission to speak.',
                    color: config.embed_color
                }
            });
            this.queues[message.guild.id] = [];
            return;
        }

        this.queues[message.guild.id][0].start_time = new Date().getTime()/1000;

        await connection.playFile(this.queues[message.guild.id][0].file)
        .on('end', reason => {
            // Unless it's because a user skipped the song, or prematurely left the channel, automatically advance the queue when a song ends
            if (reason !== 'progress_queue' && reason !== 'left_channel')
            {
                this.progress_queue(message);
            }
        });
        
        await message.channel.send({
            embed:
            {
                title: 'Now Playing',
                description: `${this.queues[message.guild.id][0].type} \`${this.queues[message.guild.id][0].title}\` (\`${this.queues[message.guild.id][0].url}\`) (Requested by **${this.queues[message.guild.id][0].requester.nickname}#${this.queues[message.guild.id][0].requester.discrim}**)`,
                color: config.embed_color
            }
        });
    }
    else
    {
        message.channel.send({
            embed:
            {
                title: 'You need to be in a voice channel.',
                description: 'Make sure that it is one that I can access, and that I have permission to speak.',
                color: config.embed_color
            }
        });
        this.queues[message.guild.id] = [];
    }
};

SoxModule.prototype.on_voice_status_update = async function (bot, oldMember, newMember)
{
    // We only care if they left
    if (oldMember.voiceChannel && !newMember.voiceChannel)
    {
        let vc = oldMember.voiceChannel;
        if (this.queues[vc.guild.id])
        {
            let remaining_members = vc.members.filterArray(function(member) {
                return member.user.id !== bot.user.id && member.id !== oldMember.user.id;
            });
            if (remaining_members.length === 0)
            {
                var matching_vc = bot.voiceConnections.find(my_vc => my_vc.channel.id === vc.id);

                // Only attempt to leave if we are actually in the channel
                if (matching_vc)
                {
                    if (matching_vc.dispatcher)
                        await matching_vc.dispatcher.end('left_channel');

                    await matching_vc.channel.leave();

                    if (this.queues[matching_vc.channel.guild.id].length > 0)
                    {
                        await this.queues[matching_vc.channel.guild.id][0].requester.channel.send({
                            embed:
                            {
                                title: 'The queue has been cleared.',
                                description: 'There\'s nobody left in the voice channel, so I cleared the queue and left.',
                                color: config.embed_color
                            }
                        });
                    }

                    this.queues[vc.guild.id] = [];
                }
            }
        }
    }
};

SoxModule.prototype.on_message = async function(bot, message, command, args)
{
    try
    {
        if (command === 'earrape' || command === 'vapor' || command === 'vapour' || command == 'play')
        {
            await this.add_to_queue(message, command, args);

            if (this.queues[message.guild.id].length === 1)
            {
                await this.start_queue(message);
            }
        }
        else if (command === 'skip')
        {
            await this.progress_queue(message);
        }
        else if (command === 'queue')
        {
            if (!this.queues[message.guild.id] || this.queues[message.guild.id].length === 0)
            {
                message.channel.send({
                    embed:
                    {
                        title: 'Song Queue',
                        description: '*There are no more songs in the queue.*',
                        color: config.embed_color
                    }
                });
            }
            else
            {
                if (this.queues[message.guild.id].length > 1)
                {
                    let queue_str = "";
                    
                    this.queues[message.guild.id].forEach((song, index) => {
                        if (index > 0)
                            queue_str += `${song.type} **${index}.** \`${song.title}\` (\`${song.url}\`) (Requested by **${song.requester.nickname}#${song.requester.discrim}**)\n\n`;
                    });

                    let first = this.queues[message.guild.id][0];
                    message.channel.send({
                        embed:
                        {
                            title: 'Now Playing',
                            description: `${first.type} \`${first.title}\` (\`${first.url}\`) (${toMMSS(new Date().getTime()/1000 - first.start_time)}/${first.duration.format('mm:ss')}) (Requested by **${first.requester.nickname}#${first.requester.discrim}**)\n`,
                            color: config.embed_color,
                            fields:
                            [
                                {
                                    name: 'Queued Songs',
                                    value: queue_str
                                }
                            ]
                        }
                    });
                }
                else if (this.queues[message.guild.id].length === 1)
                {
                    let song = this.queues[message.guild.id][0];
                    message.channel.send({
                        embed:
                        {
                            title: 'Now Playing',
                            description: `${song.type} \`${song.title}\` (\`${song.url}\`) (${toMMSS(new Date().getTime()/1000 - song.start_time)}/${song.duration.format('mm:ss')}) (Requested by **${song.requester.nickname}#${song.requester.discrim}**)\n`,
                            color: config.embed_color
                        }
                    });
                }
            }
        }
    }
    catch (error)
    {
        message.channel.send({
            embed:
            {
                title: 'Something went wrong!',
                description: 'Sorry, there was a problem processing your request.\nThis most likely occurred due to an internal error, which you should report to the developer.\nPossibly, you provided an invalid YouTube link, or the video is blocked in the United States. The bot will not process videos 60 minutes or longer in duration.',
                color: config.embed_color
            }
        });
        console.error(error);
    }
};

module.exports = SoxModule;
