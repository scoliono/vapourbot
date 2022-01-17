var path = require('path'),
    command_list = require(path.join(__dirname, '..', '..', 'commands.json')),
    config = require(path.join(__dirname, '..', '..', 'auth.json')),
    shared = new (require(path.join(__dirname, 'Shared.js')));

class VocarooMusicModule {

    constructor() {
        this.icon = ':arrow_forward:';
    }

    async do_effect() {
        let stream_filename = path.join(__dirname, '..', '..', 'downloads', `${filename}`);
        // TODO
    }

}

module.exports = VocarooMusicModule;
