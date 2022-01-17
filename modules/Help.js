var fs = require('fs'),
    path = require('path'),
    command_list = require(path.join(__dirname, '..', 'commands.json')),
    config = require(path.join(__dirname, '..', 'auth.json'));

class HelpModule {

    async on_message(bot, message, command, args) {
        var owner = await bot.users.fetch(config.owner);
        var url;

        if (command === 'invite')
            url = `https://discordapp.com/api/oauth2/authorize?scope=bot&client_id=${bot.user.id}&permissions=8192`;
        else if (command === 'help')
            url = `${config.server_url}/commands`;
        else if (command === 'songs')
            url = `${config.server_url}/songs`;
        else
            url = config.server_url;

        message.author.send({
            embed:
            {
                title: command[0].toUpperCase() + command.slice(1),
                url: url,
                color: config.embed_color,
                footer:
                {
                    text: `Created by ${owner.username}#${owner.discriminator}`,
                    icon_url: owner.displayAvatarURL()
                }
            }
        });
    }

    /*
    get_commands() {
        var list = [];
        for (var command_name in command_list)
        {
            if (command_list.hasOwnProperty(command_name))
            {
                try
                {
                    var command_ref = command_list[command_name];

                    // First, check that module exists
                    if (fs.existsSync(path.join(__dirname, command_ref.module + '.js')))
                    {
                        // Only report the command if it has a description.
                        if (command_ref.description)
                        {
                            // If we are given command usage as well, include it.
                            if (command_ref.args)
                            {
                                list.push(`**${config.prefix}${command_name}${command_ref.args}** - ${command_ref.description}`);
                            }
                            else
                            {
                                list.push(`**${config.prefix}${command_name}** - ${command_ref.description}`);
                            }
                        }
                    }
                }
                catch (error)
                {
                    console.error(error);
                    return [
                        '**Sorry!**',
                        'There was an error retrieving the command list. Please try again later.'
                    ];
                }
            }
        }
        return list;
    }
    */

}

module.exports = HelpModule;
