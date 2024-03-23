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
    const response = await axios.get(`http://127.0.0.1:5000/get_recommend_pack?user_id=${userId}`);
    const combined_films = response.data.combined_films;
    const plot_films = response.data.plot_films;
    const cast_films = response.data.cast_films;
    const genre_films = response.data.genre_films;
    const crew_films = response.data.crew_films;

    const recommendations = {
      combined_films: combined_films,
      plot_films: plot_films,
      cast_films: cast_films,
      genre_films: genre_films,
      crew_films: crew_films
    };
    
    res.json(recommendations);

  } catch (error) {
    console.error("Error:", error);
  }


});


module.exports = router;