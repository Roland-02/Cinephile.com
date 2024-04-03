//handle GET request for /home, load film data
var express = require('express');
const router = express.Router();
const axios = require("axios");
const filmsRouter = require('../routes/films');
router.use('/routes', filmsRouter);


router.get(['/', '/recommend', '/Recommend'], async function (req, res) {
  try {

    const userId = req.cookies.sessionID;

    const axiosRes = await axios.get(`http://localhost:8080/hasUserInteracted`)
    const userInteracted = axiosRes.data.hasUserInteracted;


    res.render('recommend', {
      title: 'Express',
      session: { email: req.cookies.sessionEmail, id: req.cookies.sessionID },
      refreshProfile: userInteracted

    });

  } catch (error) {
    console.error("Error:", error);
    res.render('error', { message: 'Failed to get profile' });
  }

});




module.exports = router;
