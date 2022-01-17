var path = require('path'),
    command_list = require(path.join(__dirname, '..', 'commands.json')),
    config = require(path.join(__dirname, '..', 'auth.json')),
    exec = require('child_process').exec,
    ytdl = require('ytdl-core'),
    got = require('got'),
    moment = require('moment'),
    fs = require('fs'),
    shared = new (require(path.join(__dirname, 'Music', 'Shared.js')));

class MusicModule {

    constructor() {
        // Load submodules
        this.submodules = {};

        let submodule_list = fs.readdirSync(path.join(__dirname, 'Music'));
        for (let submodule of submodule_list)
        {
            if (submodule.toLowerCase().endsWith('.js'))
            {
                // Get the part of the name without the '.js' extension
                let module_name = submodule.slice(0, -3).toLowerCase();
                try
                {
                    this.submodules[module_name] = new (require(path.join(__dirname, 'Music', submodule)));
                    console.log(`Loaded Music submodule "${module_name}" successfully.`);
                }
                catch (err)
                {
                    console.error(`Error while loading Music submodule "${module_name}": ${err}`);
                    process.exit(1);
                }
            }
        }

        // Keep track of states in servers
        this.queues = {};
        this.is_playing_sound = {};
        this.skip_vote = {};
        //TODO: Add repeat single song & repeat whole playlist
        this.repeat_last_song = {};
        this.last_command = {};

        // Cooldown, in seconds, until a queueing command can be called per person.
        this.cooldown = 1;
    }

    hashCode(str) {
        var hash = 0, i = 0, len = str.length;
        while (i < len)
        {
            hash  = ((hash << 5) - hash + str.charCodeAt(i++)) << 0;
        }

        // Return only positive hashes
        return (hash + 2147483647) + 1;
    }

    is_MIDI_URL(str) {
        var pattern = new RegExp(/[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi);

        // Needs to have .mid or .midi extensions
        return pattern.test(str) && (str.endsWith('.mid') || str.endsWith('.midi'));
    }

    async to_mp3(filename) {
        var input_filename = path.join(__dirname, '..', 'downloads', filename);
        await this.promise_from_child_process(exec(`ffmpeg -y -i "${input_filename}" "${input_filename}.mp3"`));

        // We can delete the source file once it's converted
        fs.unlinkSync(input_filename);
    }

    async get_youtube_info(command, args) {
        const yt_regex = /(?:youtube\.com\/\S*(?:(?:\/e(?:mbed))?\/|watch\/?\?(?:\S*?&?v\=))|youtu\.be\/)([a-zA-Z0-9_-]{6,11})/g;
        var ex = yt_regex.exec(args);
        var id = ex ? ex[1] : null;
        if (!id)
        {
            var response = await got(`https://www.googleapis.com/youtube/v3/search?type=video&q=${encodeURIComponent(args.join(' '))}&safeSearch=none&maxResults=1&part=id&key=${config.yt_key}`.replace('%20', '+'));
            var { items } = JSON.parse(response.body);

            if (items.length > 0)
                id = items[0].id.videoId;
            else
                throw `No results found for query "${args.join(' ')}"`;
        }

        var response = await got(`https://www.googleapis.com/youtube/v3/videos?id=${id}&part=snippet,contentDetails&key=${config.yt_key}`);
        var title = JSON.parse(response.body).items[0].snippet.title;

        var duration = moment.duration(JSON.parse(response.body).items[0].contentDetails.duration).asSeconds();

        var thumb = JSON.parse(response.body).items[0].snippet.thumbnails.default.url;
        var uploader = JSON.parse(response.body).items[0].snippet.channelTitle;

        return {
            "id": id,
            "title": title,
            "duration": duration,
            "thumb": thumb,
            "uploader": uploader
        };
    }

    async youtube_dl(output_name) {
        return new Promise((resolve, reject) =>
        {
            try
            {
                ytdl(output_name, {
                    filter: 'audioonly'
                })
                .on('progress', function(c, downloaded, total) {
                    if (downloaded >= total)
                    {
                        resolve();
                    }
                })
                .pipe(
                    fs.createWriteStream(path.join(__dirname, '..', 'downloads', output_name))
                );
            }
            catch (error)
            {
                reject(error);
            }
        });
    }

    async add_to_queue(message, command, args) {
        if (args.length < 1)
            throw `You did not provide a URL or song name! Type \`${config.prefix}help\` to get proper command usage.`;

        var progress_message = await message.channel.send({
            embed:
            {
                title: ':mag: Searching for song...',
                description: '(0/4)',
                color: config.embed_color
            }
        });

        if (args.length > 2 && !isNaN(parseInt(args[args.length - 1], 10)) && !isNaN(parseInt(args[args.length - 2], 10)))
        {
            var db = args.splice(args.length - 2);

            if (db[0] < 0 || db[0] > 100 || db[1] < 0 || db[1] > 100)
            {
                await message.channel.send({
                    embed:
                    {
                        title: ':no_entry_sign: Won\'t Process Video',
                        description: 'Gain & bass must be within 0-100 dB. Please refer to the command reference.',
                        color: config.embed_color
                    }
                });
                return false;
            }
        }
        else
        {
            var db = [this.default_gain, this.default_bass];
        }

        /*if (command !== 'midi' && command !== 'vocaroo')
        {
            var video_info = await this.get_youtube_info(command, args);

            if (video_info[2] >= 3600)
            {
                await message.channel.send({
                    embed:
                    {
                        title: ':no_entry_sign: Won\'t Download Video',
                        description: 'Video must be under 60 minutes in duration.',
                        color: config.embed_color
                    }
                });
                return false;
            }

            var output_name = video_info[0];

            // No need to re-download and re-convert MP3s that we already have
            if (!fs.existsSync(path.join(__dirname, '..', 'downloads', `${output_name}.mp3`)))
            {
                await this.youtube_dl(output_name);

                await progress_message.edit({
                    embed:
                    {
                        title: ':repeat: Converting...',
                        description: '(1/3)',
                        color: config.embed_color
                    }
                });

                await this.to_mp3(output_name);
            }
        }

        await progress_message.edit({
            embed:
            {
                title: ':thought_balloon: Processing...',
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
        else if (command === 'midi')
        {
            if (!is_MIDI_URL(args[0].trim()))
                throw `Invalid URL to MIDI file: \`${args[0].trim()}\``;

            // Strip URLs of extra spaces and slashes, generate hash
            var sanitized = args[0].trim()
                .replace(/^(http|https)\:\/\//, '') // remove the leading http:// (temporarily)
                .replace(/\/+/g, '/')       // replace consecutive slashes with a single slash
                .replace(/\/+$/, '');       // remove trailing slashes

            var url = 'http://' + sanitized;

            // Only return positive hashes as the negative sign confuses timidity
            var hashed = url.hashCode();

            output_path = await this.do_effect('m', hashed, args);
            type = ':musical_note:';
        }
        else if (command === 'reverse')
        {
            output_path = await this.do_effect('r', output_name);
            type = ':repeat:';
        }
        else if (command === 'lofi')
        {
            output_path = await this.do_effect('l', output_name);
            type = ':radio:';
        }
        else if (command === 'play')
        {
            output_path = `./downloads/${output_name}.mp3`;
            type = ':arrow_forward:';
        }
        else if (command === 'vocaroo')
        {
            var matches = /(http|https):\/\/vocaroo\.com\/i\/(\w+)/g.exec(args[0]);
            var id = matches[2];

            output_path = `./downloads/vocaroo_${id}.mp3`;

            if (!fs.existsSync(output_path))
                await shared.promise_from_download(`https://vocaroo.com/media_command.php?media=${id}&command=download_mp3`, output_path);

            type = ':arrow_forward:';
        }*/

        if (this.queues[message.guild.id] === undefined)
            this.queues[message.guild.id] = [];

        let song_info = await this.submodules[command].get_info(args, message.author, progress_message);
        song_info.command = command;
        song_info.icon = this.submodules[command].icon;
        song_info.args = db;
        this.queues[message.guild.id].push(song_info);

        // Place the song into the queue
        /*if (command === 'midi')
        {
            this.queues[message.guild.id].push({
                url: url,
                file: output_path,

                // TODO: Give these better values
                title: hashed,
                duration: 0,

                type: type,
                requester:
                {
                    user: message.author,
                    channel: message.channel
                }
            });
        }
        else if (command === 'vocaroo')
        {
            this.queues[message.guild.id].push({
                url: 'https://vocaroo.com/i/' + id,
                file: output_path,

                title: id,
                duration: 0,

                type: type,
                requester:
                {
                    user: message.author,
                    channel: message.channel
                }
            });
        }
        else
        {
            this.queues[message.guild.id].push({
                url: 'https://youtu.be/' + video_info[0],
                file: output_path,
                title: video_info[1],
                duration: video_info[2],
                thumb: video_info[3],
                author: video_info[4],
                type: type,
                requester:
                {
                    user: message.author.toString(),
                    channel: message.channel
                }
            });
        }*/

        let this_song = this.queues[message.guild.id][this.queues[message.guild.id].length - 1];

        /*await progress_message.edit({
            embed:
            {
                title: this_item.title,
                description: 'Done! Added to queue. (3/3)',
                color: config.embed_color,
                thumbnail:
                {
                    url: this_item.thumb,
                    width: 80,
                    height: 45
                },
                fields:
                [
                    {
                        name: 'Uploader',
                        value: this_item.author,
                        inline: true
                    },
                    {
                        name: 'Duration',
                        value: shared.toMMSS(this_item.duration),
                        inline: true
                    },
                    {
                        name: 'Requested By',
                        value: this_item.requester,
                        inline: true
                    }
                ],
                url: this_item.url
            }
        });*/

        return true;
    }

    async progress_queue(message) {
        const connection = message.guild.voice.connection;

        if (!this.repeat_last_song[message.guild.id])
        {
            // Remove first song from queue
            this.queues[message.guild.id].splice(0, 1);

            // Clear skip vote
            this.skip_vote[message.guild.id] = [];
        }

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
            let this_song = this.queues[message.guild.id][0];

            let dl_stream = await this.submodules[this_song.command].download_song(this_song.download);
            this.queues[message.guild.id][0].start_time = new Date().getTime() / 1000;

            let stream = await this.submodules[this_song.command].do_effect(this_song.download, dl_stream);

            connection.play(stream, {
                passes: 3
            })
            .on('speaking', value => {
                if (!value)
                    this.progress_queue(message);
            });

            if (!this.repeat_last_song[message.guild.id])
                await message.channel.send({
                    embed: this_song
                });
        }
    }

    async start_queue(message) {
        if (message.member.voice.channel)
        {
            let connection;
            try
            {
                connection = await message.member.voice.channel.join();
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

            let this_song = this.queues[message.guild.id][0];
            this.queues[message.guild.id][0].start_time = new Date().getTime() / 1000;

            // Initialize skip vote
            this.skip_vote[message.guild.id] = [];

            let dl_stream = await this.submodules[this_song.command].download_song(this_song.download);

            let stream = await this.submodules[this_song.command].do_effect(this_song.download, dl_stream);

            connection.play(stream, {
                passes: 3
            })
            .on('speaking', value => {
                // Unless it's because a user skipped the song, or prematurely left the channel, automatically advance the queue when a song ends
                if (!value)
                    this.progress_queue(message);
            });

            /*message.channel.send({
                embed:
                {
                    title: 'Now Playing',
                    description: `${this.queues[message.guild.id][0].type} \`${this.queues[message.guild.id][0].title}\` (\`${this.queues[message.guild.id][0].url}\`) (Requested by ${this.queues[message.guild.id][0].requester})`,
                    color: config.embed_color
                }
            });
            console.log(this.queues[message.guild.id][0])*/

            await message.channel.send({
                embed: this_song
            });
        }
        else
        {
            await message.channel.send({
                embed:
                {
                    title: 'You need to be in a voice channel.',
                    description: 'Make sure that it is one that I can access, and that I have permission to speak.',
                    color: config.embed_color
                }
            });
            this.queues[message.guild.id] = [];
        }
    }

    async on_voice_status_update(bot, oldState, newState) {
        // We only care if they left
        if (oldState.channel && !newState.channel)
        {
            let vc = oldState.channel;
            if (this.queues[vc.guild.id])
            {
                let remaining_members = vc.members.filter(function(member) {
                    return member.user.id !== bot.user.id && member.id !== oldState.id;
                });
                if (remaining_members.size === 0)
                {
                    var matching_vc = bot.voice.connections.get(vc.id);

                    // Only attempt to leave if we are actually in the channel
                    if (matching_vc)
                    {
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
    }

    async play_sound(bot, message, resource) {
        if (fs.existsSync(resource))
        {
            if (message.member.voice.channel)
            {
                this.is_playing_sound[message.guild.id] = true;
                var connection = await message.member.voice.channel.join();

                connection.play(resource, {
                    passes: 3
                })
                .on('speaking', value => {
                    if (!value) {
                        this.is_playing_sound[message.guild.id] = false;
                        connection.disconnect();
                    }
                });
            }
            else
            {
                message.author.send({
                    embed:
                    {
                        title: 'Couldn\'t join voice channel',
                        description: 'Make sure that it is one that I can access, and that I have permission to speak.',
                        color: config.embed_color
                    }
                });
            }
        }
        else
        {
            message.author.send({
                embed:
                {
                    title: 'Invalid Sound Effect',
                    description: 'There is no sound effect by that name.',
                    color: config.embed_color
                }
            });
        }
    }

    async on_message(bot, message, command, args) {
        try
        {
            let now = new Date().getTime() / 1000;

            // User must wait for cooldown before command will be processed.
            if (this.last_command[message.author.id] && (now - this.last_command[message.author.id]) < this.cooldown)
            {
                message.channel.send({
                    embed:
                    {
                        title: 'Cooldown',
                        description: `You must wait \`${(this.cooldown - now + this.last_command[message.author.id]).toFixed(1)}\` more seconds until you can use this command.`,
                        color: config.embed_color
                    }
                });
                return false;
            }
            this.last_command[message.author.id] = now;

            if (command === 'sound')
            {
                if (args.length > 0)
                    if ((!this.queues[message.guild.id] || this.queues[message.guild.id].length === 0) && !this.is_playing_sound[message.guild.id])
                    {
                        await this.play_sound(bot, message, path.join(__dirname, '..', 'sounds', args[0] + '.mp3'));
                        const member = await message.guild.members.fetch(bot.user.id);
                        if (member.hasPermission('MANAGE_MESSAGES'))
                            message.delete();
                    }
            }
            else if (command === 'tts')
            {
                if (args.length < 1)
                    return;

                let sound_url = /* this.tts_api_url */ 'https://talk.moustacheminer.com/api/gen?dectalk=' + encodeURIComponent(args.join(' '));
                let hash = this.hashCode(args.join(' ').toLowerCase());
                let sound_file = path.join(__dirname, '..', 'tts', hash + '.wav');
                await shared.promise_from_download(sound_url, sound_file);

                if ((!this.queues[message.guild.id] || this.queues[message.guild.id].length === 0) && !this.is_playing_sound[message.guild.id])
                    await this.play_sound(bot, message, sound_file);
            }
            else if (command === 'skip' || command === 'forceskip')
            {
                // There has to be a queue, and they have to be in the voice channel
                if (this.queues[message.guild.id] && this.queues[message.guild.id].length > 0 && message.guild.voice.connection.channel.members.get(message.author.id) !== undefined)
                {
                    if (this.skip_vote[message.guild.id].indexOf(message.author.id) === -1)
                        this.skip_vote[message.guild.id].push(message.author.id);

                    let votes_needed = (message.guild.voice.connection.channel.members.size - 1) * 0.50;
                    if (this.skip_vote[message.guild.id].length >= votes_needed || (command === 'forceskip' && await shared.isAdmin(message, message.author.id)))
                    {
                        await this.progress_queue(message);
                    }
                    else
                    {
                        message.channel.send({
                            embed:
                            {
                                title: 'Skip Vote',
                                description: `**${message.member.displayName}#${message.author.discriminator}** wants to skip. (${this.skip_vote[message.guild.id].length}/${Math.ceil(votes_needed)})`,
                                color: config.embed_color
                            }
                        });
                    }
                }
            }
            else if (command === 'repeat')
            {
                if (this.queues[message.guild.id] && this.queues[message.guild.id].length > 0)
                {
                        this.repeat_last_song[message.guild.id] = !this.repeat_last_song[message.guild.id];
                        message.channel.send({
                            embed:
                            {
                                title: ':repeat_one: Repeat',
                                description: `The current song is${this.repeat_last_song[message.guild.id] ? ' ' : ' not '}on repeat.`,
                                color: config.embed_color
                            }
                        });
                }
                else
                {
                    message.channel.send({
                        embed:
                        {
                            title: ':repeat_one: Cannot Repeat Song',
                            description: 'There is no song currently playing.',
                            color: config.embed_color
                        }
                    });
                }
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
                        let queue_str = '';

                        let first = this.queues[message.guild.id][0];
                        let total_length = 0;

                        for (let index in this.queues[message.guild.id])
                        {
                            let song = this.queues[message.guild.id][index];
                            if (index > 0)
                                queue_str += `${song.icon} **${index}.** \`${song.title}\` (\`${song.url}\`) - ${shared.toMMSS(song.length_seconds)} (Requested by ${song.requester})\n\n`;
                            total_length += song.duration;
                        }

                        message.channel.send({
                            embed:
                            {
                                title: 'Now Playing',
                                thumbnail:
                                {
                                    url: first.thumbnail_url,
                                    width: 80,
                                    height: 45
                                },
                                description: `${first.icon} \`${first.title}\` (\`${first.url}\`) (${shared.toMMSS(new Date().getTime() / 1000 - first.start_time)}/${shared.toMMSS(first.length_seconds)}) (Requested by ${first.requester})\n`,
                                color: config.embed_color,
                                fields:
                                [
                                    {
                                        name: 'Queued Songs',
                                        value: queue_str
                                    },
                                    {
                                        name: 'Total Duration',
                                        value: shared.toMMSS(total_length)
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
                                description: `${song.icon} \`${song.title}\` (\`${song.url}\`) (${shared.toMMSS(new Date().getTime() / 1000 - song.start_time)}/${shared.toMMSS(song.length_seconds)}) (Requested by ${song.requester})\n`,
                                color: config.embed_color
                            }
                        });
                    }
                }
            }
            else
            {
                // Music requested
                // If adding to queue succeeded
                if (await this.add_to_queue(message, command, args))
                {
                    if (this.queues[message.guild.id].length === 1)
                    {
                        if (!this.is_playing_sound[message.guild.id])
                            await this.start_queue(message);
                    }
                }
            }
        }
        catch (error)
        {
            //TODO: Advance queue when this happens!
            message.channel.send({
                embed:
                {
                    title: 'Something went wrong!',
                    description: error + '',
                    color: config.embed_color
                }
            });
            console.error(error);
        }
    }

}

module.exports = MusicModule;
