//handle GET request for /home, load film data
var express = require('express');
var router = express.Router();
const axios = require('axios');
const filmsRouter = require('../routes/films');
const { getConnection } = require('../database');
router.use('/routes', filmsRouter);

//open index page, load in films
router.get(['/', '/index', '/discover', '/home'], async function (req, res) {

    try {
        const page = req.query.page || 1;

        // Make a request to the films API with the current page
        const response = await axios.get(`http://localhost:8080/films?page=${page}`);
        const tempFilms = JSON.stringify(response.data)
        const films = JSON.parse(tempFilms);

        res.render('index', { title: 'Express', session: { email: req.cookies.sessionEmail, id: req.cookies.sessionID }, films: films });


    } catch (error) {
        console.error('Error fetching films:', error);
        res.status(500).send('Internal Server Error');
    }

});

//return liked attribute for specified  film
router.get('/getLikedFilms', (req, res) => {

    const userid = req.query.user_id;

    // Query database to retrieve liked elements for the specified film
    getConnection(async (err, connection) => {

        if (err) throw (err)

        const filmsQuery = `SELECT tconst FROM user_liked_attributes WHERE user_id = ?`;

        await connection.query(filmsQuery, [userid], async function (err, results) {
            if (err) throw (err)
            res.send(results);
        });

        connection.release();
    });

});

//return all loved films
router.get('/getLovedFilms', (req, res) => {

    const userid = req.query.user_id;

    // Query database to retrieve liked elements for the specified film
    getConnection(async (err, connection) => {

        if (err) throw (err)

        const filmsQuery = `SELECT tconst FROM user_loved_films WHERE user_id = ?`;

        await connection.query(filmsQuery, [userid], async function (err, results) {
            if (err) throw (err)
            res.send(results);
        });

        connection.release();
    });

})

//handle saving liked film
router.post('/loveFilm', (req, res) => {

    const tconst = req.body.film_id;
    const userid = req.body.user_id;

    getConnection(async (err, connection) => {

        if (err) throw (err)

        const searchQuery = `SELECT * FROM user_liked_attributes WHERE user_id = ? AND tconst = ?`;
        await connection.query(searchQuery, [userid, tconst], async (err, result) => {
            if (err) throw (err)

            if (result.length > 0) {

                const deleteQuery = `DELETE FROM user_liked_attributes WHERE user_id = ? AND tconst = ?`;
                await connection.query(deleteQuery, [userid, tconst], (err, result) => {
                    if (err) throw (err)

                    console.log('deleted from liked')

                });

            }

        });


        //save film
        const insertQuery = `INSERT INTO user_loved_films (user_id, tconst) VALUES (?, ?)`;

        await connection.query(insertQuery, [userid, tconst], (err, result) => {
            if (err) throw (err)

            console.log('loved film')
        });

        connection.release()

    });

    res.send('Film saved successfully'); //send response

});

//remove liked film
router.post('/unloveFilm', function (req, res) {

    const userID = req.body.user_id;
    const filmID = req.body.film_id;

    getConnection(async (err, connection) => {

        if (err) throw (err)

        const deleteQuery = `DELETE FROM user_loved_films WHERE user_id = ? AND tconst = ?`

        await connection.query(deleteQuery, [userID, filmID], async (err, result) => {

            if (err) throw (err)

            console.log('unloved film')

        });

        connection.release()
    });

    res.send('Removed succesfully')

});

//save or remove liked elements to db
router.post('/saveLikedElements', (req, res) => {

    const likedElements = req.body.liked;
    const tconst = req.body.film_id;
    const userid = req.body.user_id;

    const attributeValues = {
        Title: 0,
        Plot: 0,
        Rating: 0,
        Genre: 0,
        Runtime: 0,
        Year: 0,
        Cast: 0,
        Director: 0,
        Camera: 0,
        Writer: 0,
        Producer: 0,
        Editor: 0,
        Composer: 0
    };

    //iterate through likedElements and set the corresponding attribute value to 1
    likedElements.forEach(element => {
        //remove prefix element name to match the attribute name
        const attributeName = element.substring(5);
        if (attributeValues.hasOwnProperty(attributeName)) {
            attributeValues[attributeName] = 1;
        }
    });

    getConnection(async (err, connection) => {

        if (err) throw (err)

        const searchFilmQuery = 'SELECT * FROM user_liked_attributes WHERE tconst = ? AND user_id = ?';

        await connection.query(searchFilmQuery, [tconst, userid], async (err, filmResult) => {

            if (filmResult.length == 0) {
                //save film
                const insertQuery = `INSERT INTO user_liked_attributes (user_id, tconst, Title, Plot, Rating, Genre, Runtime, Year, Cast, Director, Camera, Writer, Producer, Editor, Composer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

                await connection.query(insertQuery, [userid, tconst, ...Object.values(attributeValues)], (err, result) => {
                    if (err) throw (err)
                });

            } else {
                // //update film
                const updateQuery = `UPDATE user_liked_attributes SET 
                                Title = ?, 
                                Plot = ?, 
                                Rating = ?, 
                                Genre = ?, 
                                Runtime = ?, 
                                Year = ?, 
                                Cast = ?, 
                                Director = ?, 
                                Camera = ?, 
                                Writer = ?, 
                                Producer = ?, 
                                Editor = ?, 
                                Composer = ?
                                WHERE user_id = ? AND tconst = ?`;

                //if every element has been unliked remove from db
                if (Object.values(attributeValues).every(value => value === 0)) {

                    const deleteQuery = `DELETE FROM user_liked_attributes WHERE user_id = ? AND tconst = ?`;
                    await connection.query(deleteQuery, [userid, tconst], (err, result) => {
                        if (err) throw (err)
                    });

                } else {
                    await connection.query(updateQuery, [...Object.values(attributeValues), userid, tconst,], (err, result) => {
                        if (err) throw (err)
                    });
                }
            };

        });

        connection.release()

    });

    res.send('Data saved successfully'); //send response

});

//return liked and elements AND loved films
router.get('/getLikedElements', function (req, res) {

    const film_id = req.query.film_id;
    const userid = req.query.user_id;

    // Query database to retrieve liked elements for the specified film
    getConnection(async (err, connection) => {

        if (err) throw (err)

        const findFilmQuery = `SELECT Title, Plot, Rating, Genre, Runtime, Year, Cast, Director, Camera, Writer, Producer, Editor, Composer FROM user_liked_attributes WHERE tconst = ? AND user_id = ?`;

        await connection.query(findFilmQuery, [film_id, userid], async function (err, results) {
            if (err) {
                console.error(err);
                res.status(500).send("Error retrieving liked data.");

            } else {
                const likedElements = [];
                results.forEach(result => {
                    Object.keys(result).forEach(key => {
                        if (result[key] === 1) {
                            likedElements.push(key);
                        }
                    });
                });
                //console.log('--------> Loaded likes');
                res.send(likedElements);
            }

        });

        connection.release();
    });

});

//add film to watchlist db
router.post('/addWatchList', function (req, res) {

    const filmID = req.body.film_id;
    const userID = req.body.user_id;

    getConnection(async (err, connection) => {

        if (err) throw (err)

        const saveQuery = `INSERT INTO user_watchlist (user_id, tconst) VALUES (?,?)`

        await connection.query(saveQuery, [userID, filmID], async (err, result) => {

            if (err) throw (err)

            res.send('Saved succesfully')

        });

        connection.release()
    });


});

//remove from from watchlist db
router.post('/deleteWatchList', function (req, res) {

    const userID = req.body.user_id;
    const filmID = req.body.film_id;

    getConnection(async (err, connection) => {

        if (err) throw (err)

        const deleteQuery = `DELETE FROM user_watchlist WHERE user_id = ? AND tconst = ?`

        await connection.query(deleteQuery, [userID, filmID], async (err, result) => {

            if (err) throw (err)

        });

        connection.release()
    });

    res.send('Removed succesfully')

});

//return watchlist db
router.get('/getWatchlist', function (req, res) {

    const userID = req.query.user_id;

    getConnection(async (err, connection) => {

        if (err) throw (err)

        const getQuery = `SELECT tconst FROM user_watchlist WHERE user_id = ?`

        await connection.query(getQuery, [userID], async (err, result) => {

            if (err) throw (err)

            res.send(result);

        });

        connection.release()
    });

});

//user logs out
router.post('/signout', function (req, res) {
    res.clearCookie('sessionEmail');
    res.clearCookie('sessionID');
    req.session.destroy();
    console.log("--------> User signed out");
    res.redirect('index');

});


module.exports = router;
