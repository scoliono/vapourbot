var path = require('path'),
    command_list = require(path.join(__dirname, '..', '..', 'commands.json')),
    config = require(path.join(__dirname, '..', '..', 'auth.json')),
    exec = require('child_process').exec,
    fs = require('fs'),
    shared = new (require(path.join(__dirname, 'Shared.js')));

class LofiMusicModule {

    constructor() {
        this.icon = ':radio:';
    }

    get_info(a, r, p) {
        return shared.get_youtube_info(a, r, p, this.icon);
    }

    download_song(q) {
        return shared.youtube_dl(q);
    }

    async do_effect(filename, stream) {
        let stream_filename = path.join(__dirname, '..', '..', 'downloads', `${filename}`);
        let converted_filename = path.join(__dirname, '..', '..', 'downloads', `${filename}.mp3`);
        let output_filename = path.join(__dirname, '..', '..', 'downloads', `${filename}_l.mp3`);

        if (!fs.existsSync(stream_filename))
        {
            await new Promise((resolve, reject) => {
                stream
                    .pipe(fs.createWriteStream(stream_filename))
                    .on('finish', resolve)
                    .on('error', reject);
            });
        }

        if (!fs.existsSync(converted_filename))
        {
            console.log(filename + " downloaded, ready to convert");
            await shared.promise_from_child_process(exec(`ffmpeg -i "${stream_filename}" "${converted_filename}"`));
        }

        if (!fs.existsSync(output_filename))
        {
            console.log(filename + " converted, ready to start processing");
            let cmd_string = `sox "${converted_filename}" "${output_filename}" rate 8k`;
            console.log(cmd_string);
            await shared.promise_from_child_process(exec(cmd_string));
        }

        return output_filename;
    }

}

module.exports = LofiMusicModule;
