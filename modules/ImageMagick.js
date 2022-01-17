var path = require('path'),
    command_list = require(path.join(__dirname, '..', 'commands.json')),
    config = require(path.join(__dirname, '..', 'auth.json')),
    exec = require('child_process').exec,
    fs = require('fs'),
    got = require('got'),
    discord = require('discord.js');
    //im = require('imagemagick');

class MagickModule {

    constructor() {
        this.accepted_image_types = ['png', 'jpg', 'jpeg'];
    }

    promise_from_child_process(child, cb) {
        var data = '';
        return new Promise(function (resolve, reject) {
            child.addListener('error', reject);
            child.addListener('exit', resolve);
            if (cb)
            {
                child.stdout.on('data', function (d) {
                    data += d.toString();
                });
                child.stdout.on('end', function () {
                    cb(data);
                });
            }
        });
    }

    promise_from_download(url, filename) {
        return new Promise(function (resolve, reject) {
            got
            .stream(url)
            .on('error', (err, body, response) => {
                fs.unlinkSync(filename);
                reject(`Error occurred while downloading \`${url}\`:\n**${err.statusCode} ${err.statusMessage}**`);
            })
            .pipe(fs.createWriteStream(filename))
            .on('finish', resolve);
        });
    }

    /*promise_from_convert(args) {
        return new Promise(function (resolve, reject) {
            im
            .convert(args, function(err, stdout) {
                if (err) reject(err);
                else resolve();
            });
        });
    }*/

    hashCode(str) {
        var hash = 0, i = 0, len = str.length;
        while (i < len)
        {
            hash  = ((hash << 5) - hash + str.charCodeAt(i++)) << 0;
        }

        // Return only positive hashes
        return (hash + 2147483647) + 1;
    }

    async liquid_rescale(url) {
        let filename = path.join(__dirname, '..', 'img', `${this.hashCode(url)}.${url.split('.').pop()}`);
        let new_filename = path.join(__dirname, '..', 'img', `${this.hashCode(url)}_new.${url.split('.').pop()}`);

        await this.promise_from_download(url, filename);
        var dimensions;
        await this.promise_from_child_process(exec(`magick identify -format "[%[fx:w],%[fx:h]]" "${filename}"`), data => { dimensions = JSON.parse(data); });
        console.log('Image dimensions are ' + dimensions);

        if (dimensions[0] > 3000 || dimensions[1] > 3000)
            throw 'Image must be under 3000x3000.';

        await this.promise_from_child_process(exec(`magick convert "${filename}" -liquid-rescale ${Math.floor(Math.random() * 10 + 50)}x${Math.floor(Math.random() * 10 + 50)}%! "${new_filename}"`));

        return new_filename;
    }

    async get_last_image(message) {
        if (message.attachments.size > 0)
        {
            return message.attachments.first().url;
        }
        else if (message.mentions.users.size > 0)
        {
            let avatar = message.mentions.users.first().displayAvatarURL;
            // Get rid of any GET parameters for dimensions
            return avatar.split('?')[0];
        }
        else
        {
            var recent_messages = await message.channel.fetchMessages({limit: 50});
            let last_image = recent_messages.find(m => m.attachments.size > 0);

            if (last_image === undefined || last_image === null) return -1;
            return last_image.attachments.first().url;
        }
    }

    async on_message(bot, message, command, args) {
        try
        {
            let url = await this.get_last_image(message);
            console.log('Attachment URL: ' + url);

            if (url === -1)
                throw 'Found no recent images in this channel.';

            let ext = url.split('.').pop();

            // If the file's extension is one of the ones we can work with
            if (this.accepted_image_types.indexOf(ext.toLowerCase()) !== -1)
            {
                let attachment_name = await this.liquid_rescale(url);
                message.channel.send(new discord.Attachment(attachment_name, 'cas.' + ext));
            }
            else
            {
                throw `Image filename must end in ${this.accepted_image_types}.`;
            }
        }
        catch (error)
        {
            message.channel.send({
                embed:
                {
                    title: 'Something went wrong!',
                    description: error + '',
                    color: config.embed_color
                }
            });
            console.error(error);
        }
    }

}

module.exports = MagickModule;
