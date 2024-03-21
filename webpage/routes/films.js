const express = require('express');
const axios = require('axios');
const router = express.Router();

const PAGE_SIZE = process.env.PAGE_SIZE; //number of films loaded at a time

const allFilms = require('../films.json');

// Route to handle paginated film requests
router.get('/films', (req, res) => {
  try {
    const page = req.query.page || 1;  // Get the requested page number

    // Calculate the start and end indices for the current page
    const startIndex = (page - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;

    const filmsForPage = allFilms.slice(startIndex, endIndex);

    res.json(filmsForPage);

  } catch (error) {
      console.error("Error:", error);
  }


});

router.get('/recommendedFilms', async (req, res) => {

  try {

    const userId = req.query.user_id;

    // Fetch films data from the API
    const response = await axios.get(`http://127.0.0.1:5000/get_bulk_recommend?user_id=${userId}`);
    const films = response.data.films;
    
    res.json(films);

  } catch (error) {
    console.error("Error:", error);
  }


});


module.exports = router;