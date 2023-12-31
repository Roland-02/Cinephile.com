//handle GET request for /home

var express = require('express');
var router = express.Router();
const fs = require('fs');
const csv = require('csvtojson');

const csvParser = require('csv-parser');
const { endianness } = require('os');







//get request - open index.ejs page
router.get(['/', '/index', '/discover', '/home'], function (req, res) {

    /*
    csv()
        .fromFile('film_data.csv')
        .then((jsonArrayObj) => {
            fs.writeFileSync('film_data.json', JSON.stringify(jsonArrayObj, null, 2));
        })
        .catch((err) => console.error(err));
        */

    //read film data into array for frontend
    const films = require('film_data.json');

    res.render('index', { title: 'Express', session: { email: req.cookies.sessionEmail }, films: films });
        

});


router.post('/signout', function (req, res) {
    res.clearCookie('sessionEmail')
    req.session.destroy();
    res.redirect('index');
});

module.exports = router;
