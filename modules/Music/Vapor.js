var path = require('path'),
    command_list = require(path.join(__dirname, '..', '..', 'commands.json')),
    config = require(path.join(__dirname, '..', '..', 'auth.json')),
    exec = require('child_process').exec,
    fs = require('fs'),
    shared = new (require(path.join(__dirname, 'Shared.js')));

class VaporwaveMusicModule {

    constructor() {
        this.icon = ':foggy:';
        this.tempo = 0.6;
        this.pitch = -500;
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
        let output_filename = path.join(__dirname, '..', '..', 'downloads', `${filename}_v.mp3`);

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

        // If the file has already been processed, no need to redo it.
        if (!fs.existsSync(output_filename))
            await shared.promise_from_child_process(exec(`sox "${converted_filename}" "${output_filename}" tempo ${this.tempo} pitch ${this.pitch}`));

        return output_filename;
    }

}

module.exports = VaporwaveMusicModule;
