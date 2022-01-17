var path = require('path'),
    scdl = require('soundcloud-downloader').default,
    command_list = require(path.join(__dirname, '..', '..', 'commands.json')),
    config = require(path.join(__dirname, '..', '..', 'auth.json')),
    exec = require('child_process').exec,
    fs = require('fs'),
    shared = new (require(path.join(__dirname, 'Shared.js')));


class SoundcloudMusicModule {

    constructor() {
        this.icon = ':arrow_forward:';
    }

    get_info(a, r, p) {
        return {
            title: 'SoundCloud Song',
            color: config.embed_color,
            download: a[0],
            requester: r.toString(),
            url: a[0],
            author:
            {
                name: `${this.icon}Now Playing`
            }
        };
    }

    download_song(q) {
        return scdl.download(q);
    }

    async do_effect(filename, stream) {
        let output_filename = path.join(__dirname, '..', '..', 'downloads', `${shared.hashCode(filename)}.mp3`);

        if (!fs.existsSync(output_filename)) {
            stream.pipe(fs.createWriteStream(output_filename));

            await (async () => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        if (fs.existsSync(output_filename))
                            resolve();
                    }, 2000);
                });
            })();
        }

        return output_filename;
    }

}

module.exports = SoundcloudMusicModule;
