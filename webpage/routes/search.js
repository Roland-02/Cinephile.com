//handle GET request for /home, load film data
var express = require('express');
const router = express.Router();
const axios = require("axios");
const filmsRouter = require('../routes/films');
router.use('/routes', filmsRouter);


router.get(['/', '/search'], async function (req, res) {
    try {
        const queryName = req.query.query;
        res.render('search', {
            title: 'Express',
            session: { email: req.cookies.sessionEmail, id: req.cookies.sessionID },
            query: queryName
        });

    } catch (error) {
        console.error("Error: ", error);
    }

});



module.exports = router;
