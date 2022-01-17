// VapourBot
// Copyright (c) James Shiffer 2018

var discord = require('discord.js'),
    fs = require('fs'),
    path = require('path'),
    config = require(path.join(__dirname, 'auth.json')),
    command_list = require(path.join(__dirname, 'commands.json'));

const bot = new discord.Client();


async function count_servers()
{
    await bot.user.setPresence({
        status: 'online',
        afk: false,
        activity: {
            name: `${config.prefix}help | ${bot.guilds.cache.size} servers`,
            type: 0
        }
    });
}

bot.once('ready', () => {
    console.log('Bot has logged in.');

    // Begin updating server counter
    bot.setInterval(count_servers, 5000);
});

bot.on('voiceStateUpdate', (oldMember, newMember) => {
    this.Music.on_voice_status_update(bot, oldMember, newMember);
});

bot.on('message', async (message) => {
    var content = message.content.trim();

    if (content.toLowerCase().startsWith(config.prefix.toLowerCase()))
    {
        if (message.author.id !== bot.user.id && !message.author.bot)
        {
            // Extract command and arguments from message content
            var arr = content.split(' ');
            var args = arr.splice(1);
            var command_name = arr[0].slice(config.prefix.length).toLowerCase();
            var command_ref = command_list.find(command => command.name.toLowerCase() === command_name);

            if (command_ref !== undefined)
            {
                // Dispatch commands
                console.log(`Command issued: "${content}"`);

                try
                {
                    //await message.channel.startTyping();

                    var module = this[command_ref.module];

                    if (typeof module.on_message === 'function')
                        await module.on_message(bot, message, command_name, args);
                }
                catch (error)
                {
                    console.error('Error while dispatching command: ' + error);
                }
                /*finally
                {
                    await message.channel.stopTyping();
                }*/
            }
            else
            {
                console.log(`Unrecognized command "${config.prefix}${command_name}"`);
            }
        }
    }
});

// Start

// Load modules
let module_list = fs.readdirSync(path.join(__dirname, 'modules'));
for (let i = 0; i < module_list.length; i++)
{
    let module_filename = module_list[i];
    if (module_filename.toLowerCase().endsWith('.js'))
    {
        // Get the part of the name without the '.js' extension
        let module_name = module_filename.slice(0, -3);
        try
        {
            this[module_name] = new (require(path.join(__dirname, 'modules', module_filename)));
            console.log(`Loaded module "${module_name}" successfully.`);
        }
        catch (err)
        {
            console.error(`Error while loading module "${module_name}": ${err}`);
            process.exit(1);
        }
    }
}

bot.login(config.token);

// Shutdown
process.once('SIGINT', async (code) => {
    console.log('Shutting down...');
    await bot.destroy();
    process.exit(0);
});
