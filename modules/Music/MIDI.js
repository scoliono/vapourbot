var path = require('path'),
    command_list = require(path.join(__dirname, '..', '..', 'commands.json')),
    config = require(path.join(__dirname, '..', '..', 'auth.json')),
    exec = require('child_process').exec,
    fs = require('fs'),
    got = require('got'),
    shared = new (require(path.join(__dirname, 'Shared.js')));

class MIDIMusicModule {

    constructor() {
        this.icon = ':musical_note:';
    }

    get_info(a, r, p) {
        return {
            title: 'MIDI File',
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
        return got.stream(q);
    }

    async do_effect(filename, stream) {
        let hash = shared.hashCode(filename);
        let output_midi = `./downloads/${hash}.midi`;

        if (!fs.existsSync(output_midi))
            await shared.promise_from_download(filename, output_midi);

        const output_filename = `./downloads/${hash}_m.mp3`;

        if (!fs.existsSync(output_filename))
        {
            await shared.promise_from_child_process(exec(`timidity "./downloads/${hash}.midi" -Ow -o "./downloads/${hash}_m.wav"`));

            // Since the .wav file produced is huge, we'll compress it as MP3
            await shared.promise_from_child_process(exec(`ffmpeg -y -i "./downloads/${hash}_m.wav" "${output_filename}"`));

            // Delete the .wav file
            fs.unlinkSync(`./downloads/${hash}_m.wav`);
        }

        return output_filename;
    }

}

module.exports = MIDIMusicModule;
