var path = require('path'),
    command_list = require(path.join(__dirname, '..', '..', 'commands.json')),
    config = require(path.join(__dirname, '..', '..', 'auth.json')),
    ytdl = require('ytdl-core'),
    got = require('got'),
    fs = require('fs');

class SharedMusicModule {

    constructor() {
        // Hours ahead/behind UTC time. (e.g.: Pacific Standard Time = -8)
        // Exact value doesn't matter, just needed for video timestamps to be on the correct day
        this.hours_offset = -8;

        /*this.recognized_formats = ['8svx','aif','aifc','aiff','aiffc','al','amb','amr-nb','amr-wb','anb','au',
            'avr','awb','caf','cdda','cdr','cvs','cvsd','cvu','dat','dvms','f32','f4','f64','f8','fap','flac',
            'fssd','gsm','gsrt','hcom','htk','ima','ircam','la','lpc','lpc10','lu','mat','mat4','mat5','maud',
            'mp2','mp3','nist','ogg','paf','prc','pvf','raw','s1','s16','s2','s24','s3','s32','s4','s8','sb',
            'sd2','sds','sf','sl','sln','smp','snd','sndfile','sndr','sndt','sou','sox','sph','sw','txw','u1',
            'u16','u2','u24','u3','u32','u4','u8','ub','ul','uw','vms','voc','vorbis','vox','w64','wav','wavpcm',
            'wv','wve','xa','xi'];*/
    }

    hashCode(str) {
        var hash = 0, i = 0, len = str.length;
        while (i < len)
        {
            hash = ((hash << 5) - hash + str.charCodeAt(i++)) << 0;
        }

        // Return only positive hashes
        return (hash + 2147483647) + 1;
    }

    promise_from_child_process(child) {
        return new Promise(function (resolve, reject) {
            child.addListener('error', reject);
            child.addListener('exit', resolve);
        });
    }

    promise_from_download(url, filename) {
        return new Promise(function (resolve, reject) {
            got
            .stream(url)
            .on('error', (err, body, response) => {
                fs.unlinkSync(filename);
                reject(`Error occurred while downloading \`${url}\`:\n**${err.statusCode} ${err.statusMessage}**`);
            })
            .pipe(fs.createWriteStream(filename))
            .on('finish', resolve);
        });
    }

    async get_youtube_info(args, requester, progress_message, icon) {
        let yt_url = await this.find_youtube_url(args.join(' '));
        let info = await ytdl.getInfo(yt_url);

        progress_message.edit({
            embed:
            {
                title: ':arrow_down: Initializing download...',
                description: '(2/4)',
                color: config.embed_color
            }
        });

        let upload_date = new Date(info.videoDetails.publishDate);
        upload_date.setHours(upload_date.getHours() - this.hours_offset);

        let embed = {
            title: info.videoDetails.title,
            color: config.embed_color,
            download: yt_url,
            requester: requester.toString(),
            thumbnail: info.videoDetails.thumbnails[0],
            fields:
            [
                {
                    name: 'Views',
                    value: parseInt(info.videoDetails.viewCount, 10).toLocaleString('en-US'),
                    inline: true
                },
                {
                    name: 'Duration',
                    value: this.toMMSS(info.videoDetails.lengthSeconds),
                    inline: true
                },
                {
                    name: 'Upload Date',
                    value: upload_date.toLocaleDateString('en-US'),
                    inline: true
                },
                {
                    name: 'Requested By',
                    value: requester + '',
                    inline: true
                }
            ],
            url: info.videoDetails.video_url,
            author:
            {
                name: `${icon ? icon + ' ' : '' }Now Playing`
            },
            footer:
            {
                text: `${info.videoDetails.author.name}`,
                icon_url: info.videoDetails.author.thumbnails[0].url
            }
        };

        progress_message.edit({
            embed:
            {
                title: info.videoDetails.title,
                description: 'Added to queue. (4/4)',
                color: config.embed_color,
                thumbnail: info.videoDetails.thumbnails[0],
                url: info.videoDetails.video_url
            }
        });

        return embed;
    }

    download_from_url(url, filename) {
        return got.stream(url)
            .on('error', (err, body, response) => {
                fs.unlinkSync(filename);
                reject(`Error occurred while downloading \`${url}\`:\n**${err.statusCode} ${err.statusMessage}**`);
            })
            .pipe(fs.createWriteStream(filename));
    }

    async isAdmin(message, id) {
        const member = await message.guild.members.fetch(id);
        return member.hasPermission('ADMINISTRATOR') || config.owner === id;
    }

    async search_youtube(query) {
        var response = await got(`https://www.googleapis.com/youtube/v3/search?type=video&q=${encodeURIComponent(query)}&safeSearch=none&maxResults=1&part=id&key=${config.yt_key}`.replace('%20', '+'));

        let j = JSON.parse(response.body);

        if (j.pageInfo.totalResults === 0)
            throw 'No search results found!';

        return j.items[0].id.videoId;
    }

    async find_youtube_url(query) {
        // In case "query" is just the video ID, need to do second check
        if (!ytdl.validateURL(query) && !ytdl.validateID(query))
            return await this.search_youtube(query);
        return ytdl.getVideoID(query);
    }

    async youtube_dl(query, restrict_format = false) {
        // Is this really needed? Should pass in url instead?
        let url = await this.find_youtube_url(query);

        /* some webm audio formats aren't recognized by SoX
        if (restrict_format)
        {
            return ytdl(url, {
                quality: 'highestaudio',
                filter: format => {
                    console.log(format);
                    return this.recognized_formats.indexOf(format.container) !== -1;
                }
            });
        }*/

        return ytdl(url, {
            quality: 'highestaudio',
            filter: 'audioonly'
        });
    }

    toMMSS(num) {
        var sec_num = parseInt(num, 10);    // don't forget the second param
        var minutes   = Math.floor(sec_num / 60);
        var seconds = sec_num - (minutes * 60);

        if (minutes < 10) minutes = '0' + minutes;
        if (seconds < 10) seconds = '0' + seconds;
        return minutes + ':' + seconds;
    }

}

module.exports = SharedMusicModule;
