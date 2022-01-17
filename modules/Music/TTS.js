var path = require('path'),
    command_list = require(path.join(__dirname, '..', '..', 'commands.json')),
    config = require(path.join(__dirname, '..', '..', 'auth.json')),
    shared = new (require(path.join(__dirname, 'Shared.js')));

class TTSMusicModule {

    constructor() {
        // API URL for TTS service
        this.tts_api_url = 'https://talk.moustacheminer.com/api/gen?dectalk=';
    }

}

module.exports = TTSMusicModule;
