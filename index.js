const Discord = require("discord.js"),
    fs = require('fs'),
    client = new Discord.Client(),
	ytdl = require('ytdl-core'),
	ffmpeg = require('fluent-ffmpeg'),
	exec = require('child_process').exec,
	yts = require('youtube-search'),
	pip = require('public-ip'),
    config = require('./auth.json'),
	server_cfg = require('./server/server.json'),
	request = require('request'),
	md = require("html-md"),
	async = require("async"),
	wolfram = require('wolfram').createClient(config.wolfram_key);

var connections = [];
var queues = {
	"-1": [
		{
		}
	]
};

var servers_joined = 0;

const spinner_array = [ "-", "\\", "|", "/" ];
var spinner_index = -1;

const wide_chars = "ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ ０１２３４５６７８９！＃＄％＆＇（）＊＋－．，／：；＜＞＠＝？［］｛｝～｜＿"
const normal_chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789!#$%&'()*+-.,/:;<>@=?[]{}~|_"

function get_spinner()
{
	spinner_index++;
    return spinner_array[spinner_index%4];
}

function play(connection, id, msg)
{
	return new Promise((resolve, reject) =>
	{
		connections[connection.channelID] = connection;
		if (connection.playing)
		{
			reject(new Error("Already playing a song!"));
		}
		var already_downloaded = fs.existsSync(`./downloads/${id}p.wav`);
		if (!already_downloaded)
		{
			var dl_msg;
			var last_progress_update = 0;
			msg.channel.sendMessage("Downloading...").then(m => {
				dl_msg = m;
				ytdl("http://www.youtube.com/watch?v="+id, { filter: 'audioonly' }).on('progress', (chunk, downloaded, total) => {
					last_progress_update++;
					// idk
					if (last_progress_update % 100 == 0 || downloaded >= total)
					{
						dl_msg.edit("Downloading... "+ ((downloaded >= total) ? ":100: %" : ("`"+get_spinner()+"`")))
						.then(() => {
							if (downloaded >= total)
							{
									//console.log(downloaded, total)
									dl_msg.edit("Processing...");
									console.log("Downloaded http://youtu.be/"+id);
									var command = ffmpeg(`./downloads/${id}.ogg`).format("wav").audioBitrate('48k').on('end', (stdout, stderr) => {
										console.log("Successfully converted https://youtu.be/"+ id);
										dl_msg.edit("(50%) Conversion done.");
										// Floral Shoppe: ~60% tempo, P4 down (-500 cents).
										exec(`sox ./downloads/${id}.wav ./downloads/${id}p.wav tempo 0.6 pitch -500`, (error, stdout, stderr) => {
											dl_msg.edit("(100%) Processed. Will begin streaming.");
											var stream = fs.createReadStream(`./downloads/${id}p.wav`);
											connection.playStream(stream).on('end', () => {resolve();});
											var saved = (fs.statSync("./downloads/"+id+".wav").size + fs.statSync("./downloads/"+id+".ogg").size)/1024.0/1024.0;
											exec(`rm ./downloads/${id}.ogg ./downloads/${id}.wav`, (error, stdout, stderr) => {
												console.log(`Conserved ${saved.toFixed(2)} MB deleting old files for http://youtu.be/${id}`);
											});
											//bot.createMessage(now.txt, `Playing **${now.name}**`);
											//return stream;
										});
									}).save(`./downloads/${id}.wav`);
								}
						})
						.catch(console.error);
						last_progress_update = Date.now();
					}
				}).pipe(fs.createWriteStream(`./downloads/${id}.ogg`));
			}).catch((err) => {
				reject(new Error(err));
			});
		}
		else
		{
			console.log(`No need to download http://youtu.be/${id}; I have it cached.`);
			msg.channel.sendMessage("Already downloaded & processed. Streaming cached version...");
			var stream = fs.createReadStream("./downloads/"+id+'p.wav');
			connection.playStream(stream).on('end', () => {resolve();});
			//return stream;
			//bot.createMessage(now.txt, `Playing **${now.name}**`);
		}
	});
}

function pre_play(msg, id)
{
	msg.delete();
	if (!msg.member.voiceChannel)
	{
		msg.reply("You need to be in a voice channel.");
	}
	else
	{
			// "Initializing" a list item
			var new_to_queue = false;
			if (!queues[msg.guild.id] || queues[msg.guild.id].length == 0)
			{
				new_to_queue = true;
				queues[msg.guild.id] = [];
			}
			ytdl.getInfo("https://youtube.com/watch?v="+id, options=null, (err, info) => {
				if (err)
				{
					console.error(err);
				}
				console.log(`Fetched title for http://youtu.be/${id}: "${info.title}"`);
				queues[msg.guild.id].push({
					"url": id,
					"requester": msg.author.username,
					"vc": msg.member.voiceChannel,
					"tc": msg.channel,
					"title": info.title
				});

				if (new_to_queue) next_in_queue(msg, 0);
				else msg.reply("I've added your song request to the queue.");
			});
	}
}

// Start here
client.login(config.token);

/*client.on('guildMemberAdd', member => {
	console.log(member.nickname+" ["+member.id+"] joined the guild");
	if (member.id == client.user.id)
		member.setNickname("VAPOURBOT / 蒸気ロボット");
});*/

client.on('message', msg => {
	//console.log(msg.content)
	if (msg.content.startsWith(config.prefix+"vapor ") || msg.content.startsWith(config.prefix+"vapour "))
	{
		var yt_regex = /(?:youtube\.com\/\S*(?:(?:\/e(?:mbed))?\/|watch\/?\?(?:\S*?&?v\=))|youtu\.be\/)([a-zA-Z0-9_-]{6,11})/g;
		var url = msg.content.replace(new RegExp("\\"+config.prefix+"(vapor|vapour)\ "), "")
		//console.log(url);
		var ex = yt_regex.exec(url);
		var id = ex ? ex[1] : null;
		//console.log(id);
		if (!id)
		{
			yts(url, {maxResults: 1, key: config.yt_key }, (err, results) => {
				//console.log(results)
				if (err)
				{
					console.error(err);
					msg.reply(`Failed to search for video \`${url}\``);
				}
				else
				{
					pre_play(msg, results[0].id);
				}
			});
		}
		else
		{
			pre_play(msg, id);
		}
	}
	else if (msg.content.startsWith(config.prefix+"nick"))
	{
		msg.delete();
		msg.author.sendMessage("ｎｉｃｅ ｍｅｍｅ ｋｉｄｄｏ");
		msg.channel.guild.members.find("id", client.user.id).setNickname("VAPOURBOT / 蒸気ロボット");
	}
	else if (msg.content.startsWith(config.prefix+"queue"))
	{
		if (queues[msg.guild.id] && queues[msg.guild.id][0])
		{
			var str = "\n";
			queues[msg.guild.id].forEach((e, i) => {
				str += `${i+1}. **${e.title}** (\`https://youtu.be/${e.url}\`) - Requested by **${e.requester}**\n`;
			});
			msg.reply(str);
		}
		else
			msg.reply("There are no songs currently in the queue -- now's your chance! Play a song with `>vapour [YouTube URL]`.");
	}
	else if (msg.content.startsWith(config.prefix+"wide "))
	{
		var str = msg.content.replace(config.prefix+"wide ", "");
		var new_str = [];
		for (var i=0; i<str.length; i++)
		{
			new_str[i] = wide_chars[normal_chars.indexOf(str[i])] ? wide_chars[normal_chars.indexOf(str[i])] : str[i];
		}
		msg.channel.sendMessage(new_str.join(""));
	}
	else if (msg.content.startsWith(config.prefix+"spacify "))
	{
		var str = msg.content.replace(config.prefix+"spacify ", "");
		var new_str = "";
		for (var i=0; i<str.length; i++)
		{
			new_str += (str[i] + " ");
		}
		msg.channel.sendMessage(new_str);
	}
	else if (msg.content.startsWith(config.prefix+"help"))
	{
		pip.v4().then(ip => {
			msg.reply(`\n\`${config.prefix}vapour [YouTube video]\` - plays a YouTube video (by name or URL) in vaporwave style.\n`+
				`\`${config.prefix}vapor [YouTube video]\` - same function as \`${config.prefix}vapour\`.\n`+
				`\`${config.prefix}queue\` - Displays the current queue of requested songs and who requested them.\n`+
				`\`${config.prefix}wide [text]\` - Converts normal text into ｗｉｄｅ ｔｅｘｔ．\n`+
				`\`${config.prefix}spacify [text]\` - Converts normal text into s p a c i f i e d  t e x t .\n`+
				`\`${config.prefix}help\` - Shows this message.\n`+
				`You can view and download the songs I have processed at http://${ip}${(server_cfg.port == 80) ? "" : ":"+ server_cfg.port}/`);
		});
	}
	else
	{
	}
});

// Loops through queue.
function next_in_queue(msg, index)
{
	var id = msg.guild.id;
	var current = queues[id][index];
	current.vc.join().then(connection => {
		console.log("Connected to voice in guild "+ msg.guild.id);
		play(connection, current.url, msg).then(() => {
			var next = queues[id][index + 1];
			console.log("Stream ended in guild "+ msg.guild.id +". "+ (next ? "Now playing http://youtu.be/"+next.title : "Queue is done.") );
			if (next)
			{
				msg.channel.sendMessage(`Now Playing: **${next.title}** - \`https://youtu.be/${next.url}\` (requested by **${next.requester}**)`);
				// dat recursion
				next_in_queue(msg, index + 1);
			}
			else
			{
				msg.channel.sendMessage("I've played every song in the queue.");
				current.vc.leave();
				queues[id] = [];
			}
		}).catch((err) => {
			console.error(err);
		});
	});
}

client.on('voiceStateUpdate', (oldMember, newMember) => {
    if (queues[newMember.guild.id])
	{
        var vc = newMember.voiceChannel ? newMember.voiceChannel : oldMember.voiceChannel;
		if (vc.members.array().length == 1 && vc.members.array()[0].user.equals(client.user))
		{
			vc.leave();
			queues[vc.guild.id][queues[vc.guild.id].length-1].tc.sendMessage("Nobody's in the voice channel anymore, so I ended the queue.");
			queues[vc.guild.id] = [];
		}
	}
});

client.on('ready', () => {
    console.log('Logged in.');
	setInterval(() => {
		client.user.setStatus('online', `${config.prefix}help | Serving ${client.guilds.array().length} servers`);
	}, 5000);
});
