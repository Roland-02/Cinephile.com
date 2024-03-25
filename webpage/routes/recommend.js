//handle GET request for /home, load film data
var express = require('express');
const router = express.Router();
const axios = require("axios");


async function updateProfileAndVectors(userId) {
    await axios.post(`http://127.0.0.1:5000/update_profile_and_vectors?user_id=${userId}`, {
      })
      .then(function (response) {
        console.log(response.data.message);
      })
      .catch(function (error) {
        console.log(error);
      });
};
async function cacheRecommendedFilms(user_id) {
  //load batch of films from file

  try {
      // Fetch films data from the API
      const response = await axios.post(`http://localhost:8080/cacheRecommendedFilms?user_id=${user_id}`);
  } catch (error) {
      console.error('Error fetching films:', error);
  }

};


router.get(['/', '/recommend', '/Recommend'], async function (req, res) {
    try {

        const userId = req.cookies.sessionID;

        // update profile when page is loaded - stagger later
        await updateProfileAndVectors(userId);
        await cacheRecommendedFilms(userId)

        res.render('recommend', {
            title: 'Express',
            session: { email: req.cookies.sessionEmail, id: req.cookies.sessionID }
        
        });
        
    } catch (error) {
        console.error("Error:", error);
        res.render('error', { message: 'Failed to get profile' });
    }
});


module.exports = router;
