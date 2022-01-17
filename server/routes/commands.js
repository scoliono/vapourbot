var express = require('express');
var router = express.Router();

var fs = require('fs');
var path = require('path');

var config = require(path.join(__dirname, '..', '..', 'auth.json'));
var command_list = require(path.join(__dirname, '..', '..', 'commands.json'));

/* GET command list. */
router.get('/', function (req, res, next) {
    res.render('commands', { title: 'VapourBot | Command List', commands: command_list, prefix: config.prefix});
});

// Load command list
console.log(`Found ${command_list.length} commands.`);

module.exports = router;
