//handle GET request for /home

var express = require('express');
var router = express.Router();
const fs = require('fs');
const csvParser = require('csv-parser');

//get request - open index.ejs page
router.get(['/', '/index', '/discover', '/home'], function (req, res) {

    const films = [];

    fs.createReadStream('film_data.csv').pipe(csvParser()).on('data', (row) => {
        films.push(row);
    })
    .on('end', () => {
        res.render('index', { title: 'Express', session: { email: req.cookies.sessionEmail }, films: films });
    })

});


router.post('/signout', function (req, res) {
    res.clearCookie('sessionEmail')
    req.session.destroy();
    res.redirect('index');
});

module.exports = router;
