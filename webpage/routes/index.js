//handle GET request for /home

var express = require('express');
var router = express.Router();

//get request - open index.ejs page
router.get(['/', '/home', '/index', '/homepage'], function (req, res) {
    res.render('index', { title: 'Express', session: {email : req.cookies.sessionEmail }} );

});

router.post('/signout', function (req, res) {
    res.clearCookie('sessionEmail')
    req.session.destroy();
    res.redirect('index');
});

module.exports = router;
