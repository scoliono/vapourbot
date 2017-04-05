# VapourBot

A Discord bot for all things vaporwave!

VapourBot is still in development, and new features may be added along the way.

## Commands

To use these, simply type out the command preceded by the command prefix. This is customizable and thus may vary from server to server, so ask the person who configured the bot for this.

Command                  | What it Does                                                         
------------------------ | ---------------------------------------------------------------------
`vapor <YouTube video>`  | Plays a YouTube video (by name or URL) in vaporwave style.           
`vapour <YouTube video>` | Alias of "vapor".                                                    
`nick`                   | Changes the bot's nickname in the current server. (Easter egg)       
`queue`                  | Displays the current queue of requested songs and who requested them.
`wide <text>`            | Converts normal text into fullwidth text.                            
`spacify <text>`         | Inserts a space between each character of a string.                  
`help`                   | Sends a list of commands and their usage.                            

## Installation

Download a ZIP of the repository, and extract it. You will need to have [Node.js](https://nodejs.org/), [SoX](http://sox.sourceforge.net/), and [FFmpeg](http://ffmpeg.org/) on your computer. Then, navigate to the repository's directory and run `npm install` in a terminal. You will have to copy `auth_example.json` to `auth.json` and modify it so the bot can sign in. To run the bot, type `node index.js` in a terminal.

*Note:* The bot caches YouTube videos that it downloads, and this could potentially take up a lot of storage. Use it at your own risk.

### auth.json Attributes

**prefix** - A character that precedes every command to be recognized by VapourBot. (e.g. a prefix of "!" means VapourBot will recognize "!help" as a command.)

**token** - Discord bot login token. Get this at <https://discordapp.com/developers/applications/me>.

**id** - The bot's client ID. Go to the link above, go to App Details -> Client ID.

**yt_key** - For searching using the YouTube Data API. Go to <https://console.developers.google.com/apis/api/youtube.googleapis.com/overview>, make a project, and get an API key.

## For Server Administrators

[Click here](https://discordapp.com/oauth2/authorize?client_id=287064493584941057&scope=bot&permissions=8192) to add the bot (the version hosted by me) to the server. The "Manage Messages" permission can be enabled if you want the bot to delete the users' messages when they send commands.
