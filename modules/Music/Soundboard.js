var path = require('path'),
    command_list = require(path.join(__dirname, '..', '..', 'commands.json')),
    config = require(path.join(__dirname, '..', '..', 'auth.json')),
    shared = new (require(path.join(__dirname, 'Shared.js')));

class SoundboardMusicModule {}

module.exports = SoundboardMusicModule;
