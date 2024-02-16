//handle GET request for /home, load film data
var express = require('express');
var router = express.Router();
const axios = require('axios');
const filmsRouter = require('../routes/films');
const { getConnection } = require('../database');
router.use('/routes', filmsRouter);

var myFilms = [];

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


router.get('/getMyFilms', (req, res) => {

    const userid = req.query.user_id;

    // Query database to retrieve liked elements for the specified film
    getConnection(async (err, connection) => {

        if (err) throw (err)

        const filmsQuery = `SELECT tconst FROM user_films WHERE user_id = ?`;

        await connection.query(filmsQuery, [userid], async function (err, results) {
            if (err) throw (err)
            myFilms = results;
        });
        connection.release();

    });

    res.send(myFilms)

});


//route to handle saving liked elements
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

        const searchFilmQuery = 'SELECT * FROM user_films WHERE tconst = ? AND user_id = ?';

        await connection.query(searchFilmQuery, [tconst, userid], async (err, filmResult) => {

            if (filmResult.length == 0) {
                //save film
                const insertQuery = `INSERT INTO user_films (user_id, tconst, Title, Plot, Rating, Genre, Runtime, Year, Cast, Director, Camera, Writer, Producer, Editor, Composer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

                await connection.query(insertQuery, [userid, tconst, ...Object.values(attributeValues)], (err, result) => {
                    if (err) throw (err)

                    connection.release()
                    myFilms.push(tconst)
                    console.log("--------> Saved likes");
                });

            } else {
                // //update film
                const updateQuery = `UPDATE user_films SET 
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

                await connection.query(updateQuery, [...Object.values(attributeValues), userid, tconst,], (err, result) => {
                    if (err) throw (err)

                    connection.release()
                    console.log("--------> Updated likes");
                });

            };

        });

    });

    res.send('Data saved successfully'); //send response

});


//return liked films and elements
router.get('/getLikedElements', function (req, res) {

    const film_id = req.query.film_id;
    const userid = req.query.user_id;

    // Query database to retrieve liked elements for the specified film
    getConnection(async (err, connection) => {

        if (err) throw (err)

        const findFilmQuery = `SELECT Title, Plot, Rating, Genre, Runtime, Year, Cast, Director, Camera, Writer, Producer, Editor, Composer FROM user_films WHERE tconst = ? AND user_id = ?`;

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
                console.log('--------> Loaded likes')
                res.send(likedElements);
            }

        });

        connection.release();
    });

});


router.post('/signout', function (req, res) {
    res.clearCookie('sessionEmail');
    res.clearCookie('sessionID');
    req.session.destroy();
    console.log("--------> User signed out");
    res.redirect('index');

});


module.exports = router;
