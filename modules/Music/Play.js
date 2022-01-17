var path = require('path'),
    command_list = require(path.join(__dirname, '..', '..', 'commands.json')),
    config = require(path.join(__dirname, '..', '..', 'auth.json')),
    exec = require('child_process').exec,
    fs = require('fs'),
    shared = new (require(path.join(__dirname, 'Shared.js')));


class PlayMusicModule {

    constructor() {
        this.icon = ':arrow_forward:';
    }

    get_info(a, r, p) {
        return shared.get_youtube_info(a, r, p, this.icon);
    }

    download_song(q) {
        return shared.youtube_dl(q);
    }

    async do_effect(filename, stream) {
        let output_filename = path.join(__dirname, '..', '..', 'downloads', filename);

        if (!fs.existsSync(output_filename))
        {
            stream.pipe(fs.createWriteStream(output_filename));

            // Hacky way to make sure the download has started before reading stream
            //TODO: also check filesize > 0
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

module.exports = PlayMusicModule;
