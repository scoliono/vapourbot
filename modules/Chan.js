var path = require('path'),
    command_list = require(path.join(__dirname, '..', 'commands.json')),
    config = require(path.join(__dirname, '..', 'auth.json')),
    got = require('got'),
    entities = require('entities'),
    jsdom = require('jsdom'),
    { JSDOM } = jsdom;

class ChanModule {

    async get_boards(nsfw) {
        try
        {
            var req = await got('https://a.4cdn.org/boards.json');
            var { boards } = JSON.parse(req.body);

            if (!nsfw)
            {
                boards = boards.filter(board => {
                    return board.ws_board === 1;
                });
            }

            // Shuffle board list
            boards.sort(() => Math.random() * 2 - 1);

            return boards;
        }
        catch (err)
        {
            console.error(err);
        }
    }

    async find_post(boards, nsfw) {
        for (let board of boards)
        {
            for (let page = 1; page <= 10; page++)
            {
                try
                {
                    var req = await got(`https://a.4cdn.org/${board.board}/${page}.json`);
                    var { threads } = JSON.parse(req.body);

                    for (let thread of threads)
                    {
                        var posts = thread.posts.filter(p => {
                            if (p.com)
                            {
                                return (p.com.includes('<span class="quote">&gt;tfw') || p.com.includes('<span class="quote">&gt;mfw')) && p.tim && p.filename;
                            }
                            else
                            {
                                return false;
                            }
                        });
                        if (posts.length > 0)
                        {
                            var post = posts[Math.floor(Math.random() * posts.length)];
                            var img_url = `https://i.4cdn.org/${board.board}/${post.tim}${post.ext}`;

                            let comment = post.com;

                            // Remove HTML tags from post comment, decode HTML entities like &gt;
                            // Convert <br> tags to newlines, and <s> into spoilers first
                            let dom = new JSDOM(comment);

                            // todo: account for [spoiler][/spoiler]
                            dom.window.document.querySelectorAll('s').forEach(spoiler => {
                                comment = comment.replace(spoiler.textContent, '[SPOILER]');
                            });

                            console.log(comment);

                            var regex = /(<([^>]+)>)/ig;
                            comment = comment.replace(/\<br\>/ig, '\n').replace(regex, '');

                            console.log(comment);

                            comment = entities.decodeHTML(comment);

                            // Attach media as a video if it is a webm
                            return post.ext.toLowerCase() === '.webm' ? {
                                title: `4chan - /${board.board}/`,
                                description: '```css\n' + comment + '```',
                                color: config.embed_color,
                                video:
                                {
                                    url: img_url
                                }
                            } : {
                                title: `4chan - /${board.board}/`,
                                description: '```css\n' + comment + '```',
                                color: config.embed_color,
                                image:
                                {
                                    url: img_url
                                }
                            };
                        }
                    }
                }
                catch (err)
                {
                    console.error(err);
                }
            }
        }
    }

    async on_message(bot, message, command, args) {
        try
        {
            var nsfw = message.channel.nsfw && args.includes('nsfw');
            var boards = await this.get_boards(nsfw);

            await message.channel.send({
                embed: await this.find_post(boards, nsfw)
            });
        }
        catch (error)
        {
            await message.channel.send({
                embed:
                {
                    title: `4chan Search`,
                    description: 'There was an error while looking for posts.',
                    color: config.embed_color
                }
            });
            console.log(error);
        }
    }

}

module.exports = ChanModule;
