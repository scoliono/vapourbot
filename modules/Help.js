var fs = require('fs'),
    path = require('path'),
    command_list = require(path.join(__dirname, '../commands.json')),
    config = require(path.join(__dirname, '../auth.json'));

var HelpModule = function()
{
};

HelpModule.prototype.get_commands = function()
{
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
};

HelpModule.prototype.on_message = async function(bot, message, command, args)
{
    message.channel.send('Sent to DM!');
    message.author.send({
        embed:
        {
            title: 'Command Reference',
            description: this.get_commands().join('\n\n'),
            color: config.embed_color,
            footer:
            {
                text: 'Created by scoliono#4782',
                icon_url: 'https://cdn.discordapp.com/avatars/166762831713271817/2d0568e3ce44741e655a49ec627d9c9e.png'
            }
        }
    });
};

module.exports = HelpModule;
