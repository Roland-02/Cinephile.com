const express = require('express');
const axios = require('axios');
const router = express.Router();
const fetch = require('node-fetch');
const PAGE_SIZE = process.env.PAGE_SIZE; //number of films loaded at a time
var { getConnection } = require('../database');
const allFilmsPromise = loadFilmsDB();
let allFilms = []


router.get('/datasetLength', async (req, res) => {
  try {
    await allFilmsPromise;
    res.json(allFilms.length);
  } catch (error) {
    console.error(error)
  }

})

router.get('/indexPageFilms', async (req, res) => {
  try {
    await allFilmsPromise;

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


router.post('/shuffleFilms', async (req, res) => {
  try {
    await allFilmsPromise;

    var user_id = req.query.user_id;
    var excludeRes = await axios.get(`http://127.0.0.1:8081/get_user_films?user_id=${user_id}`)
    var excludeTconsts = excludeRes.data.tconsts;

    var shuffledFilms = allFilms = [...allFilms].sort(() => Math.random() - 0.5);

    const includedFilms = [];
    const excludedFilms = [];
    shuffledFilms.forEach(film => {
      if (excludeTconsts.includes(film.tconst)) {
        excludedFilms.push(film);
      } else {
        includedFilms.push(film);
      }
    });

    // Concatenate included and excluded films
    allFilms = includedFilms.concat(excludedFilms);

    res.json('Film shuffled')

  } catch (error) {
    console.error("Error:", error);

  }

});

// Route to handle opening a specific film
router.get('/openClickedFilm', async (req, res) => {
  try {
    await allFilmsPromise;

    const tconst = req.query.tconst; // Assuming tconst is sent in the request query

    // Find the index of the film in the allFilms dataset
    const filmIndex = allFilms.findIndex(film => film.tconst === tconst);

    // Calculate the page number to which the film belongs
    const page = Math.floor(filmIndex / PAGE_SIZE) + 1;

    // Calculate the currentIndex within the page
    const startIndex = (page - 1) * PAGE_SIZE;
    const currentIndex = filmIndex - startIndex;

    // Calculate the counter
    const counter = filmIndex;

    res.json({ "counter": counter, "currentIndex": currentIndex })

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


function loadFilmsDB() {
  return new Promise((resolve, reject) => {
    getConnection(async (err, connection) => {

      if (err) {
        reject(err);
        return;
      }

      const query = 'SELECT * FROM all_films';

      connection.query(query, async (err, results) => {
        connection.release();

        if (err) {
          reject(err);
          return;
        }

        allFilms = JSON.parse(JSON.stringify(results))
        resolve();
      });
    });
  });
}




module.exports = router;