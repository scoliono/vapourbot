var express = require('express');
var router = express.Router();

/* GET command list. */
router.get('/', function (req, res, next) {
    res.render('songs', { title: 'VapourBot | Processed Songs', files: [] });
});

module.exports = router;
