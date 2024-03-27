//handle GET request for /home, load film data
var express = require('express');
const router = express.Router();
const filmsRouter = require('../routes/films');
router.use('/routes', filmsRouter);

//open profile page,
router.get(['/', '/profile', '/myFilms'], async function (req, res) {

    try {
        res.render('profile', { title: 'Express', session: { email: req.cookies.sessionEmail, id: req.cookies.sessionID } });

    } catch (error) {
        console.error('Error fetching films:', error);
        res.status(500).send('Internal Server Error');
    }

});


module.exports = router;
