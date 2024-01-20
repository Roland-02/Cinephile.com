//handle GET request for /home, load film data
var express = require('express');
var router = express.Router();
const fs = require('fs');
const axios = require('axios');
const filmsRouter = require('../routes/films');
router.use('/routes', filmsRouter);


//get request - open index.ejs page
router.get(['/', '/index', '/discover', '/home'], async function (req, res) {

    try {
        const page = req.query.page || 1;
        
        // Make a request to the films API with the current page
        const response = await axios.get(`http://localhost:8080/films?page=${page}`);
        const tempFilms = JSON.stringify(response.data)
        const films = JSON.parse(tempFilms);

        res.render('index', { title: 'Express', session: { email: req.cookies.sessionEmail }, films: films });


    } catch (error) {
        console.error('Error fetching films:', error);
        res.status(500).send('Internal Server Error');
    }

});


router.post('/signout', function (req, res) {
    res.clearCookie('sessionEmail')
    req.session.destroy();
    res.redirect('index');
});


module.exports = router;
