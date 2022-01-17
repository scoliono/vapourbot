const express = require("express"),
    config = require("./server.json"),
    path = require("path"),
    fs = require("fs"),
    request = require("request"),
    favicon = require("serve-favicon"),
    ffmpeg = require("fluent-ffmpeg"),
    queue = require("queue");
var app = express();
var q = queue();

app.use(express.static(process.cwd()));
app.use(express.static(__dirname));
app.use(favicon(path.join(__dirname, "vapor.jpg")));

app.set("view engine", "pug");

function sec_to_hms(d)
{
    var h = Math.floor(d / 3600);
    var m = Math.floor(d % 3600 / 60);
    var s = Math.floor(d % 3600 % 60);
    return ((h > 0 ? h + ":" + (m < 10 ? "0" : "") : "") + m + ":" + (s < 10 ? "0" : "") + s);
}

function get_yt_title(file, id, state)
{
    return new Promise((resolve, reject) => {
        request(`https://www.googleapis.com/youtube/v3/videos?id=${id}&key=${config.yt_key}&fields=items(id,snippet(channelId,title,categoryId))&part=snippet`, (e, r, body) => {
            if (!e && r.statusCode === 200 && !JSON.parse(body).error && JSON.parse(body).items[0])
            {
                resolve(JSON.parse(body).items[0].snippet.title);
            }
            else
            {
                if (JSON.parse(body).error)
                    reject(JSON.parse(body).error.code);
                else
                    resolve("null");
            }
        });
    });
}

function get_dir_listing()
{
    return new Promise((resolve, reject) => {
        var dir_listing = [];
        fs.readdir("../downloads", (err, files) => {
            if (err)
            {
                reject(err);
            }
            files.splice(files.indexOf(".gitignore"), 1);

            if (!files[0])
            {
                resolve([]);
            }

            // remove duplicate files from our listing
            // Make this its own for loop because the array is being mutated
            var len = files.length;
            for (var i=0; files[i] && i<len; i++)
            {
                var f = files[i];
                if (f.endsWith(".wav"))
                {
                    if (f.endsWith("p.wav") && f.length == 16)
                    {
                        // This file is done with conversion and processing.
                        if (files.indexOf(f.split(0, 11)+".wav") != -1) files.splice(files.indexOf(f.split(0, 11)+".wav"), 1); // asdf.wav
                        if (files.indexOf(f.replace(path.extname(f),".ogg")) != -1) files.splice(files.indexOf(f.replace(path.extname(f),".ogg")), 1); // asdf.ogg
                    }
                    else
                    {
                        // This file is still processing, but has been converted to WAV.
                        if (files.indexOf(f.replace(path.extname(f),".ogg")) != -1) files.splice(files.indexOf(f.replace(path.extname(f),".ogg")), 1); // asdf.ogg
                    }
                }
                else
                {
                    // This file has only been downloaded; nothing to do.
                }
            }

            files.forEach(file => {
                try
                {
                    var state;
                    switch (path.extname(file))
                    {
                        case ".wav":
                            if (file.length == 16)
                            {
                                state = "Done";
                            }
                            else
                            {
                                state = "Processing";
                            }
                            break;
                        case ".ogg":
                            state = "Converting";
                            break;
                        default:
                            state = "unknown";
                    }
                    var id = file.length == 16 ? file.replace(path.extname(file), "").slice(0, -1) : file.replace(path.extname(file), "");
                    q.push((cb) => {
                        get_yt_title(file, id, state).then(res => {
                            ffmpeg.ffprobe("../downloads/"+ file, function(err, metadata) {
                                if (!err)
                                {
                                    dir_listing.push({
                                        "file": file,
                                        "id": id,
                                        "state": state,
                                        "name": res,
                                        "size": (metadata.format.size/1024.0/1024.0).toFixed(1) +"MB",
                                        "duration": sec_to_hms(metadata.format.duration)
                                    });
                                    dir_listing.sort((a, b) => {
                                        if (a.name.toUpperCase() > b.name.toUpperCase())
                                            return 1;
                                        else if (a.name.toUpperCase() < b.name.toUpperCase())
                                            return -1;
                                        else
                                            return 0;
                                    });
                                    cb();
                                }
                                else
                                {
                                    throw new Error(err);
                                }
                            });
                        }, err => {
                            throw new Error(err);
                        });
                    });
                }
                catch (e)
                {
                    console.error(e);
                    reject(e);
                }
            });
            q.start(() => {
                ;
            });
            q.on("end", () => {
                console.info("Generated directory listing successfully.");
                resolve(dir_listing);
            });
        });
    });
}

app.get("/", (req, res) => {
    get_dir_listing().then(response => {
        res.render("template.pug", { files: response });
    }, err => {
        console.error(err);
    });
});

app.get("/downloads/:id.wav", (req, res) => {
    var p = path.resolve(__dirname, "../downloads/"+ req.params.id + ".wav");
    fs.access(p, fs.constants.F_OK, err => {
        if (err || !req.params.id.endsWith("p") || req.params.id.length != 12)
            res.status(404).send("404 Resource Not Found");
        else
            res.sendFile(req.params.id +".wav", {root: path.resolve(__dirname, "../downloads/")});
    });
});

app.get("/files", (req, res) => {
    get_dir_listing().then(l => {
        res.json(l);
    });
});

app.use((req, res) => {
    res.status(404).send("404 Resource Not Found");
});

app.listen(config.port, () => {
    console.info(`Server listening on port ${config.port}`);
});
