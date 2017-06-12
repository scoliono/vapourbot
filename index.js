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

client.on('guildCreate', guild => {
	console.log("Joined guild "+ guild.id);
	guild.defaultChannel.sendMessage("Hi! I'm VapourBot! Type `>help` to see a list of available commands.\n\nVapourBot Development Server: https://discord.gg/zzuQpmA");
});

client.on('message', msg => {
	if (msg.author.id !== client.user.id)
	{
		msg.content = msg.content.toLowerCase();

		if ((msg.content.indexOf("<@"+client.user.id+">") != -1 || msg.content.indexOf("<@!"+client.user.id+">") != -1) && msg.author.id != client.user.id)
		{
			client.guilds.find(g => g.members.find("id", config.owner)).members.find("id", config.owner).sendMessage("**"+msg.author.username+"#"+msg.author.discriminator+" ("+msg.author.id+"):**\n"+msg.content);
		}

		if (msg.content.startsWith(config.prefix+"vapor ") || msg.content.startsWith(config.prefix+"vapour "))
		{
			var yt_regex = /(?:youtube\.com\/\S*(?:(?:\/e(?:mbed))?\/|watch\/?\?(?:\S*?&?v\=))|youtu\.be\/)([a-zA-Z0-9_-]{6,11})/g;
			var url = msg.content.replace(new RegExp("\\"+config.prefix+"(vapor|vapour)\ "), "");
			var ex = yt_regex.exec(url);
			var id = ex ? ex[1] : null;
			if (!id)
			{
				yts(url, {maxResults: 1, key: config.yt_key }, (err, results) => {
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
		else if (msg.content.startsWith(config.prefix+"spacify"))
		{
			var str = msg.content;
			var count = str.match(/\>spacify(\d+)? /i)[1];
			if (!count) count = 1;
			var new_str = "";
			str = str.replace(/\>spacify(\d+)? /i, "");
			for (var i = 0; i < str.length; i++)
			{
				new_str += str[i];
				for (var j = 0; j < count; j++) 
				{
					new_str += " ";
				}
			}
			msg.channel.sendMessage(new_str);
		}
		else if (msg.content.startsWith(config.prefix+"mocking "))
		{
			var str = msg.content.replace(config.prefix+"mocking ", "");
			var new_str = "";
			for (var i=0; i<str.length; i++)
			{
				if (i%2 === 0) new_str += str[i].toUpperCase();
				else new_str += str[i].toLowerCase();
			}
			msg.channel.sendMessage(new_str);
		}
		else if (msg.content.startsWith(config.prefix+"block "))
		{
			var str = msg.content.replace(config.prefix+"block ", "").replace(/ /g, "   ");

			var matched_numbers = str.match(/([0-9])/g);
			str = str.replace(/([a-zA-Z])/g, ":regional_indicator_$1:").toLowerCase()
			if (matched_numbers)
			{
				str = str.replace(/([0-9])/g, match => {
					return {"1": ":one:", "2": ":two:", "3": ":three:", "4": ":four:", "5": ":five:", "6": ":six:", "7": ":seven:", "8": ":eight:", "9": ":nine:", "0": ":zero:"}[match];
				}).replace(/\:one\:\:zero\:\:zero\:/, ":100:").replace(/\:one\:\:zero\:/g, ":keycap_ten:");
			}
			msg.channel.sendMessage(str);
		}
		else if (msg.content.startsWith(config.prefix+"palindrome "))
		{
			var str = msg.content.replace(config.prefix+"palindrome ", "");
			var new_strs = [];
			var strs = str.split(" ");
			for (var i in strs)
			{
				var s = strs[i];
				if (s.length >= 2)
				{
					var s = strs[i];
					new_strs.push(s[0].toUpperCase() + s[1].toLowerCase() + s[1].toLowerCase() + s[0].toUpperCase());
				}
			}
			msg.channel.sendMessage(new_strs.join(" "));
		}
		else if (msg.content.startsWith(config.prefix+"vertical "))
		{
			var str = msg.content.replace(config.prefix+"vertical ", "");
			var new_str = str;
			for (var i = 1; i < str.length; i++)
			{
				var c = str[i];
				new_str += "\n";
				new_str += c;
			}
			msg.channel.sendMessage(new_str);
		}
		else if (msg.content.startsWith(config.prefix+"pyramid "))
		{
			var str = msg.content.replace(config.prefix+"pyramid ", "").split(" ");
			var str1 = str[0];
			var str2 = str.splice(1).join(" ");

			var pivot = str1.length-1; //str1.lastIndexOf(str2[0]);
			var new_str = "";
			if (str1[pivot] !== str2[0])
			{
				new_str = "The first word's last letter must be the second word's first letter.";
			}
			else
			{
				for (var i=0; i<=pivot; i++)
				{
						new_str += str1.slice(i)+"\n";
				}
				for (var i=2; i<str2.length; i++)
				{
						if (str2[i].match(/\w/g))
						new_str += str2.slice(0,i)+"\n";
				}
				new_str += str2;
			}

			msg.channel.sendMessage(new_str);
		}
		else if (msg.content.startsWith(config.prefix+"mfw vapor") || msg.content.startsWith(config.prefix+"mfw vapour"))
		{
			var flag = msg.content.replace(config.prefix, "").replace(/^mfw (vapor|vapour)/g, "").replace(/( |\-)/g, "").toLowerCase();

			if (flag === "nsfw" && !msg.channel.name.startsWith("nsfw-"))
			{
				msg.reply("You're not in a NSFW channel.");
			}
			else
			{
				request("https://a.4cdn.org/boards.json", (err, res, body) => {
					var b = JSON.parse(body);
					var boards = b.boards.filter(board => {
						return board.ws_board || flag === "nsfw";
					});
					var post_found = false;

					async.whilst(() => {
						return !post_found;
					}, next => {
						var board = boards[Math.floor(Math.random() * boards.length)].board;
						msg.reply("Searching /"+ board +"/");
						for (var i = 1; (i <= 10) && !post_found; i++)
						{
							request("http://a.4cdn.org/"+ board +"/"+ i +".json", (err2, res2, body2) => {
								var b2 = JSON.parse(body2);
								b2.threads.forEach(thread => {
									var posts = thread.posts.filter(p => {
										if (p.com)
										{
											return (p.com.includes("<span class=\"quote\">&gt;tfw") || p.com.includes("<span class=\"quote\">&gt;mfw")) && p.tim && p.filename;
										}
										else
										{
											return false;
										}
									});
									if (posts.length > 0)
									{
										if (!post_found)
										{
											var post = posts[Math.floor(Math.random() * posts.length)];
											var img_url = "https://i.4cdn.org/"+ board +"/"+ post.tim + post.ext;

											// Convert HTML to Markdown.
											var post_formatted = md(post.com).replace(/\[\d\]/g, "").replace(/\[(\>\>\d+)\]/g, "**$1**").replace(/\: #p\d+/g, "");
											msg.channel.sendFile(img_url, "" + post.tim + post.ext, post_formatted);
											post_found = true;
										}
									}
									else
									{
										if (i === 10)
										{
											next();
										}
									}
								});
							});
						}
					}, err => {
						
					});
				});
			}
		}
		else if (msg.content.startsWith(config.prefix+"ping"))
		{
			var d1 = new Date().getTime();
			msg.channel.sendMessage("Pong...").then(m => {
				m.edit("Pong! Response took "+ (new Date().getTime()-d1).toString() +" ms. :ping_pong:");
			});
		}
		else if (msg.content.startsWith(config.prefix+"graph "))
		{
			var str = msg.content.replace(config.prefix+"graph ", "");
			
			// Give some indication that we're doing something
			msg.channel.startTyping();

			wolfram.query(str, function(err, result) {
				msg.channel.stopTyping();
				if (err)
				{
					msg.reply("ERROR: "+ err);
					console.error(err);
				}
				else
				{
					var pod = result.find((i) => {
						return i.title.toLowerCase().includes('visualization') || i.title.toLowerCase().includes('visual representation') || i.title.toLowerCase().includes("plot");
					});

					if (pod === undefined)
					{
						msg.reply("That doesn't produce a graph! Is that a valid function?");
					}
					else
					{
						msg.channel.sendFile(pod.subpods[0].image, "plot.gif", "<@"+ msg.author.id +">");
					}
				}
			});
		}
		else if (msg.content.startsWith(config.prefix+"help"))
		{
			pip.v4().then(ip => {
				msg.reply(`\n\`${config.prefix}vapour [YouTube video]\` - plays a YouTube video (by name or URL) in vaporwave style.\n`+
					`\`${config.prefix}vapor [YouTube video]\` - same function as \`${config.prefix}vapour\`.\n`+
					`\`${config.prefix}queue\` - Displays the current queue of requested songs and who requested them.\n`+
					`\`${config.prefix}wide [text]\` - Converts normal text into ｗｉｄｅ ｔｅｘｔ．\n`+
					`\`${config.prefix}spacify[num] [text]\` - Converts normal text into s p a c i f i e d  t e x t . \`num\` specifies the number of spaces between each character. If no number is provided, it will default to 1.\n`+
					`\`${config.prefix}mocking [text]\` - MoCkInG SpOnGeBoB MeMe.\n`+
					`\`${config.prefix}block [text]\` - :regional_indicator_b: :regional_indicator_l: :regional_indicator_o: :regional_indicator_c: :regional_indicator_k: :regional_indicator_y: text.\n`+
					`\`${config.prefix}palindrome [text]\` - "Send" => "SeeS"\n`+
					`\`${config.prefix}vertical [text]\` - Writes a message vertically as well as horizontally.\n`+
					`\`${config.prefix}pyramid [word] [phrase]\` - Cleverly combines a word and a phrase.\n`+
					`\`${config.prefix}ping\` - Pings the bot to check response time.\n`+
					`\`${config.prefix}graph [function]\` - Graphs a mathematical function using Wolfram|Alpha.\n`+
					`\`${config.prefix}mfw vapour (-nsfw)\` - Returns a random reaction image from 4chan. The \`-nsfw\` option searches NSFW boards as well.\n`+
					`\`${config.prefix}mfw vapor (-nsfw)\` - same function as \`${config.prefix}mfw vapour\`.\n`+
					`\`${config.prefix}help\` - Shows this message.\n`+
					`You can view and download the songs I have processed at http://${ip}${(server_cfg.port == 80) ? "" : ":"+ server_cfg.port}/\n`+
					"\nVapourBot Development Server: https://discord.gg/zzuQpmA");
			});
		}
		else
		{
		}
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
