// VapourBot
// Copyright (c) James Shiffer 2017

var discord = require('discord.js'),
    path = require('path'),
    config = require(path.join(__dirname, 'auth.json')),
    command_list = require(path.join(__dirname, 'commands.json'));
    
// Load modules
this.Chan            = new (require('./modules/Chan.js')),
this.Help            = new (require('./modules/Help.js')),
this.Nickname        = new (require('./modules/Nickname.js')),
this.Ping            = new (require('./modules/Ping.js')),
this.SoX             = new (require('./modules/SoX.js')),
this.StrOperations   = new (require('./modules/StrOperations.js')),
this.Wolfram         = new (require('./modules/Wolfram.js'));

const bot = new discord.Client();


bot.on('ready', () => {
  console.log('Bot has logged in.');
});

bot.on('voiceStateUpdate', (oldMember, newMember) => {
    this.SoX.on_voice_status_update(bot, oldMember, newMember);
});

bot.on('message', message => {
    var content = message.content.trim();

    if (content.toLowerCase().startsWith(config.prefix.toLowerCase()))
    {
        if (message.author.id !== bot.user.id && !message.author.bot)
        {
            // Extract command and arguments from message content
            var arr = content.split(' ');
            var args = arr.splice(1);
            var command_name = arr[0].slice(config.prefix.length).toLowerCase();

            if (Object.keys(command_list).indexOf(command_name) !== -1)
            {
                // Dispatch commands
                console.info(`Command issued: "${content}"`);

                try
                {
                    message.channel.startTyping();

                    var command_ref = command_list[command_name];
                    var module = this[command_ref.module];
                    
                    module.on_message(bot, message, command_name, args);

                    message.channel.stopTyping(true);
                }
                catch (error)
                {
                    console.error('Error while dispatching command: ' + error);
                }
            }
            else
            {
                console.info(`Unrecognized command "${config.prefix}${command_name}"`);
            }
        }
    }
});

// Start
bot.login(config.token);
