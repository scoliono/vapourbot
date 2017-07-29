var path = require('path'),
    discord = require('discord.js'),
    command_list = require(path.join(__dirname, '../commands.json')),
    config = require(path.join(__dirname, '../auth.json'));

var NicknameModule = function()
{
};

NicknameModule.prototype.on_message = async function(bot, message, command, args)
{
    var perms = message.channel.permissionsFor(message.author);
    if (perms)
    {
        if (perms.has(discord.Permissions.FLAGS.MANAGE_NICKNAMES, true))
        {
            var guild_member = message.guild.member(bot.user);
            if (guild_member)
            {
                guild_member.setNickname('VAPOURBOT / 蒸気ロボット');
            }
        }
    }
};

module.exports = NicknameModule;
