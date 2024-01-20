const express = require('express');
const router = express.Router();

const PAGE_SIZE = 5; //number of films loaded at a time

const allFilms = require('../film_data.json');

// Route to handle paginated film requests
router.get('/films', (req, res) => {
  const page = req.query.page || 1;  // Get the requested page number


  // Calculate the start and end indices for the current page
  const startIndex = (page - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;

  const filmsForPage = allFilms.slice(startIndex, endIndex);

  res.json(filmsForPage);
});


module.exports = router;