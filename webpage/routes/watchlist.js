//handle GET request for /home, load film data
var express = require('express');
const router = express.Router();
const axios = require("axios");
const filmsRouter = require('../routes/films');
router.use('/routes', filmsRouter);


router.get(['/', '/watchlist'], async function (req, res) {
    try {

        res.render('watchlist', {
            title: 'Express',
            session: { email: req.cookies.sessionEmail, id: req.cookies.sessionID }

        });

    } catch (error) {
        console.error("Error:", error);
    }

});


module.exports = router;
