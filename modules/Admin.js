var path = require('path'),
    command_list = require(path.join(__dirname, '..', 'commands.json')),
    config = require(path.join(__dirname, '..', 'auth.json')),
    cp = require('child_process');

class AdminModule {

    async on_message(bot, message, command, args) {
        try
        {
            if (config.owner == message.author.id)
            {
                if (command === 'shutdown')
                {
                    console.log('Shutting down in 3 seconds...');
                    setTimeout(async () => {
                        await bot.destroy();
                        process.exit(0);
                    }, 3000);
                }
                else if (command === 'restart')
                {
                    console.log('Restarting in 3 seconds...');

                    process.on('exit', () => {
                        var child = cp.spawn(process.argv.shift(), process.argv,
                        {
                            cwd: process.cwd(),
                            detached: true,
                            stdio: 'inherit'
                        });

                        child.unref();
                        console.log('Restarted successfully.');
                    });

                    setTimeout(async () => {
                        await bot.destroy();
                        process.exit(0);
                    }, 3000);
                }
            }
            else
            {
                message.channel.send({
                    embed:
                    {
                        title: 'Permission Required',
                        description: 'You must be admin to use this command.',
                        color: config.embed_color
                    }
                });
            }
        }
        catch (error)
        {
            message.channel.send({
                embed:
                {
                    title: 'Error',
                    description: `There was an error while executing command \`${config.prefix}${command}\`:\n${error}`,
                    color: config.embed_color
                }
            });
            console.log(error);
        }
    }

}

module.exports = AdminModule;
