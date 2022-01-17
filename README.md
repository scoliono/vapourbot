# VapourBot

A Discord bot for all things vaporwave!

VapourBot is still in development, and new features may be added along the way.

## Commands

To use these, simply type out the command preceded by the command prefix. This is customizable and thus may vary from server to server, so ask the person who configured the bot for this.

Command                   | What it Does                                                         
------------------------- | ---------------------------------------------------------------------
`vapour <YouTube video>`  | Plays a YouTube video (by name or URL) in vaporwave style.
`vapor <YouTube video>`   | Alias of `vapour`.
`nick`                    | Changes the bot's nickname in the current server. (Easter egg)
`queue`                   | Displays the current queue of requested songs and who requested them.
`wide <text>`             | Converts normal text into fullwidth text.
`spacify<num> <text>`     | Inserts `num` spaces between each character of a string. If no `num` is provided, it will default to 1.
`mocking <text>`          | Alternates the cases of each character in the string, `LiKe tHiS`.
`block <text>`            | Converts each character of a string into a regional indicator emoji.
`palindrome <text>`       | Creates a palindrome of the first two letters of every word.
`vertical <text>`         | Writes a message vertically as well as horizontally.
`pyramid <word> <phrase>` | Cleverly combines a word and a phrase.
`ping`                    | Pings the bot and reports response time.
`graph <function>`        | Graphs a mathematical function using Wolfram\|Alpha.
`mfw vapour [-nsfw]`      | Returns a random reaction image from 4chan. The optional `-nsfw` flag searches NSFW boards as well.
`mfw vapor [-nsfw]`       | Alias of `mfw vapour`.
`help`                    | Shows a list of commands and their usage.

## Installation

Download a ZIP of the repository, and extract it. You will need to have [Node.js](https://nodejs.org/), [SoX](http://sox.sourceforge.net/), [TiMidity++](http://timidity.sourceforge.net/), [ImageMagick](https://imagemagick.org/script/binary-releases.php), and [FFmpeg](http://ffmpeg.org/) on your computer. Then, navigate to the repository's directory and run `npm install` in a terminal. You will have to copy `auth_example.json` to `auth.json` and modify it so the bot can sign in. To run the bot, type `node index.js` in a terminal.

To start the web server, navigate into the `server` directory in your terminal and run `node server.js`. You will first have to configure this by copying `server_example.json` to `server.json` and modifying the values.

*Note:* The bot keeps YouTube videos that it downloads and processes, and this could potentially take up a lot of storage. Use it at your own risk.

### auth.json Attributes

**prefix** - A character that precedes every command to be recognized by VapourBot. (e.g. a prefix of "!" means VapourBot will recognize "!help" as a command.)

**token** - Discord bot login token. Get this at <https://discordapp.com/developers/applications/me>.

**yt_key** - For searching using the YouTube Data API. Go to <https://console.developers.google.com/apis/api/youtube.googleapis.com/overview>, make a project, and get an API key.

**owner** - The ID of the owner of the bot. (Enable Developer Mode in Discord, right-click on your name, then "Copy ID".)

**wolfram_key** - Wolfram|Alpha AppID. (Go to <https://developer.wolframalpha.com/portal/myapps> and click on "Get an AppID".)

### server/server.json Attributes

**port** - Which port to listen on. (e.g. `8080`)

**yt_key** - The same YouTube API key as the one in `auth.json`.

## For Server Administrators

[Click here](https://discordapp.com/oauth2/authorize?client_id=287064493584941057&scope=bot&permissions=8192) to add the bot (the version hosted by me) to the server. The "Manage Messages" permission can be enabled if you want the bot to delete the users' messages when they send commands.
