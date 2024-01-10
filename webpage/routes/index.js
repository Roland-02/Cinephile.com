//handle GET request for /home, load film data
var express = require('express');
var router = express.Router();
const fs = require('fs');

//get request - open index.ejs page
router.get(['/', '/index', '/discover', '/home'], function (req, res) {

    const file = fs.readFileSync('film_data.json', 'utf-8');
    const films = JSON.parse(file);

    //read film data into array for frontend
    res.render('index', { title: 'Express', session: { email: req.cookies.sessionEmail }, films: films });

});


router.post('/signout', function (req, res) {
    res.clearCookie('sessionEmail')
    req.session.destroy();
    res.redirect('index');
});


module.exports = router;
