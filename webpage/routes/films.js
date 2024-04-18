const express = require('express');
const axios = require('axios');
const router = express.Router();
const PAGE_SIZE = process.env.PAGE_SIZE; //number of films loaded at a time
var { getConnection } = require('../database');
const allFilmsPromise = loadFilmsDB();
let allFilms = [];
let filteredFilms = [];



router.get('/indexPageFilms', async (req, res) => {
  try {
    await allFilmsPromise; //wait until allFilms has loaded

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


router.get('/filteredPageFilms', async (req, res) => {
  try{

    const page = req.query.page || 1;  // Get the requested page number

    // Calculate the start and end indices for the current page
    const startIndex = (page - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;

    const filmsForPage = filteredFilms.slice(startIndex, endIndex);

    res.json(filmsForPage);

  }catch (error){
    console.error("Error: ", error);

  }

})


router.post('/filter', async (req, res) => {
  try {
    await allFilmsPromise; //wait until allFilms has loaded

    const filter = req.query.filter; // Get the filter data from query parameters
    filteredFilms = [...allFilms];

    if (filter) {

      if (!(filter.rating === 'Any' && filter.genre === 'Any' && filter.runtime === 'Any' && filter.year === 'Any')) {

        if (filter.rating !== 'Any') {
          filteredFilms = filteredFilms.filter(film => Math.floor(film.averageRating) === parseInt(filter.rating));
        }

        if (filter.genre !== 'Any') {
          filteredFilms = filteredFilms.filter(film => film.genres.includes(filter.genre));
        }

        if (filter.runtime !== 'Any') {
          if (filter.runtime === '≤ 1 Hr') {
            filteredFilms = filteredFilms.filter(film => film.runtimeMinutes <= 60);
          } else if (filter.runtime === '≤ 1Hr 30m') {
            filteredFilms = filteredFilms.filter(film => (film.runtimeMinutes <= 90 && film.runtimeMinutes > 60));
          } else if (filter.runtime === '≤ 2Hrs') {
            filteredFilms = filteredFilms.filter(film => (film.runtimeMinutes <= 120 && film.runtimeMinutes > 90));
          } else if (filter.runtime === '≤ 2Hrs 30m') {
            filteredFilms = filteredFilms.filter(film => (film.runtimeMinutes <= 150 && film.runtimeMinutes > 120));
          } else if (filter.runtime === '≤ 3Hrs') {
            filteredFilms = filteredFilms.filter(film => (film.runtimeMinutes <= 180 && film.runtimeMinutes > 150));
          } else if (filter.runtime === 'really long...') {
            filteredFilms = filteredFilms.filter(film => film.runtimeMinutes > 180);
          }
        }

        if (filter.year !== 'Any') {
          let startYear, endYear;
          switch (filter.year) {
            case '2020s':
              startYear = 2020;
              endYear = 2029;
              break;
            case '2010s':
              startYear = 2010;
              endYear = 2019;
              break;
            case '2000s':
              startYear = 2000;
              endYear = 2009;
              break;
            case '1990s':
              startYear = 1990;
              endYear = 1999;
              break;
            case '1980s':
              startYear = 1980;
              endYear = 1989;
              break;
            case '1970s':
              startYear = 1970;
              endYear = 1979;
              break;
            case '1960s':
              startYear = 1960;
              endYear = 1969;
              break;
            case '1950s':
              startYear = 1950;
              endYear = 1959;
              break;
            default:
              startYear = 1950;
              endYear = 2029;
              break;
          }

          filteredFilms = filteredFilms.filter(film => {
            const filmYear = parseInt(film.startYear);
            return filmYear >= startYear && filmYear <= endYear;
          });
        }


        // console.log('Filtered films')
        console.log(filteredFilms.length)
        res.json(filteredFilms.length);

      }

    }

  } catch (error) {
    console.error("Error: ", error)

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


router.get('/datasetLength', async (req, res) => {
  try {
    await allFilmsPromise;
    res.json(allFilms.length);
  } catch (error) {
    console.error(error)
  }

})


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
        shuffleArray(allFilms);

        resolve();
      });
    });
  });
}


function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}


module.exports = router;