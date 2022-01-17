var path = require('path'),
    command_list = require(path.join(__dirname, '..', '..', 'commands.json')),
    config = require(path.join(__dirname, '..', '..', 'auth.json')),
    exec = require('child_process').exec,
    fs = require('fs'),
    shared = new (require(path.join(__dirname, 'Shared.js')));


class EarrapeMusicModule {

    constructor() {
        this.icon = ':loudspeaker:';

        // Default gain and bass amounts for earrape, in decibels.
        this.default_gain = 50;
        this.default_bass = 15;

        // Factor by which to soften earrape tracks before playing, to avoid hearing damage.
        this.quiet = 0.5;

        this.args = [];
    }

    get_info(a, r, p) {
        this.args = a;
        if (this.args.length >= 2 && Number.isInteger(+this.args[0]) && Number.isInteger(+this.args[1])) {
            a = this.args.slice(2);
        }
        return shared.get_youtube_info(a, r, p, this.icon);
    }

    download_song(q) {
        return shared.youtube_dl(q, true);
    }

    async do_effect(filename, stream) {
        if (this.args.length >= 2) {
            this.args[0] = parseInt(this.args[0], 10);
            this.args[1] = parseInt(this.args[1], 10);
        }

        let gain = (Number.isInteger(this.args[0]) && this.args[0] >= 0 && this.args[0] <= 500) ? this.args[0] : this.default_gain;
        let bass = (Number.isInteger(this.args[1]) && this.args[1] >= 0 && this.args[1] <= 500) ? this.args[1] : this.default_bass;

        let stream_filename = path.join(__dirname, '..', '..', 'downloads', `${filename}`);
        let converted_filename = path.join(__dirname, '..', '..', 'downloads', `${filename}.mp3`);
        let output_filename = path.join(__dirname, '..', '..', 'downloads', `${filename}_e_${gain}_${bass}.mp3`);

        if (!fs.existsSync(stream_filename)) {
            await new Promise((resolve, reject) => {
                stream.pipe(fs.createWriteStream(stream_filename))
                      .on('finish', resolve)
                      .on('error', reject);
            });
        }

        if (!fs.existsSync(converted_filename)) {
            console.log(filename + " downloaded, ready to convert");
            await shared.promise_from_child_process(exec(`ffmpeg -i "${stream_filename}" "${converted_filename}"`));
        }

        if (!fs.existsSync(output_filename)) {
            console.log(filename + " converted, ready to start processing");
            let cmd_string = `sox "${converted_filename}" "${output_filename}" overdrive ${gain} bass ${bass} vol ${this.quiet}`;
            console.log(cmd_string);
            await shared.promise_from_child_process(exec(cmd_string));
        }

        return output_filename;
    }

}

module.exports = EarrapeMusicModule;
