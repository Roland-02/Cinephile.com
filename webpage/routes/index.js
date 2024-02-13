//handle GET request for /home, load film data
var express = require('express');
var router = express.Router();
const axios = require('axios');
const filmsRouter = require('../routes/films');
const bodyParser = require('body-parser');

const mysql = require('mysql');
var { getConnection } = require('../database');

router.use('/routes', filmsRouter);


//open index page, load in films
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




// POST route to handle saving liked elements
router.post('/saveLiked', (req, res) => {
    const likedElements = req.body.likedElements;


    //parse likeElements into 0,1 representation



    //store in db


    res.send('Liked elements saved successfully'); // Send response
});














router.post('/signout', function (req, res) {
    res.clearCookie('sessionEmail')
    req.session.destroy();
    res.redirect('index');
});


module.exports = router;
