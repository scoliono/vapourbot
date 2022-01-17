var path = require('path'),
    command_list = require(path.join(__dirname, '..', 'commands.json')),
    config = require(path.join(__dirname, '..', 'auth.json'));

class PingModule {

    async on_message(bot, message, command, args) {
        try
        {
            var d1 = new Date().getTime();
            var ping_message = await message.channel.send({
                embed:
                {
                    title: 'Pinging...',
                    color: config.embed_color,
                    description: ':ping_pong: Pong...'
                }
            });
            var diff = new Date().getTime() - d1;
            await ping_message.edit({
                embed:
                {
                    title: 'Ping',
                    color: config.embed_color,
                    description: `:ping_pong: Pong... **${diff} ms**`
                }
            });
        }
        catch (error)
        {
            console.error(error);
        }
    }

}

module.exports = PingModule;
