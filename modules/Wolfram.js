var path = require('path'),
    command_list = require(path.join(__dirname, '..', 'commands.json')),
    config = require(path.join(__dirname, '..', 'auth.json')),
    got = require('got'),
    discord = require('discord.js'),
    fs = require('fs');
    // currently broken on windows because npm dumb
    // wolfram = require('wolfram-alpha').createClient(config.wolfram_key);

class WolframModule {

    constructor() {
        this.latex_url = 'https://latex.codecogs.com/png.latex?';
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

    hashCode(str) {
        var hash = 0, i = 0, len = str.length;
        while (i < len)
        {
            hash  = ((hash << 5) - hash + str.charCodeAt(i++)) << 0;
        }

        // Return only positive hashes
        return (hash + 2147483647) + 1;
    }

    async on_message(bot, message, command, args) {
        if (command === 'graph')
        {
            try
            {
                var result = await wolfram.query('graph ' + args.join(' '));

                var pod = result.find(i => {
                    return i.title.toLowerCase().includes('visualization')
                        || i.title.toLowerCase().includes('visual representation')
                        || i.title.toLowerCase().includes('plot');
                });

                if (pod === undefined)
                {
                    message.channel.send({
                        embed:
                        {
                            title: 'Wolfram|Alpha Graph',
                            description: 'That function does not appear to have a graph.',
                            color: config.embed_color
                        }
                    });
                }
                else
                {
                    message.channel.send({
                        embed:
                        {
                            title: 'Wolfram|Alpha Graph',
                            description: '```' + args.join(' ') + '```',
                            image:
                            {
                                url: pod.subpods[0].image
                            },
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
                        title: 'Wolfram|Alpha Graph',
                        description: 'Sorry, there was an error retrieving the graph.',
                        color: config.embed_color
                    }
                });
            }
        }
        else if (command === 'latex')
        {
            let url = args.join(' ').replace('(', '\(').replace(')', '\)');
            let file_path = path.join(__dirname, '..', 'img', `latex_${this.hashCode(url)}.png`);
            let file = await this.promise_from_download(this.latex_url + url, file_path);

            message.channel.send(new discord.Attachment(file_path, 'latex.png'));
        }
    }

}

module.exports = WolframModule;
