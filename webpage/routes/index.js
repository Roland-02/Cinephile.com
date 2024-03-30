//handle GET request for /home, load film data
var express = require('express');
const router = express.Router();
const { getConnection } = require('../database');
const filmsRouter = require('../routes/films');
router.use('/routes', filmsRouter);
var hasUserInteracted = false;

//open index page, load in films
router.get(['/', '/index', '/discover', '/home'], async function (req, res) {

    try {
        hasUserInteracted = false;
        res.render('index', { title: 'Express', session: { email: req.cookies.sessionEmail, id: req.cookies.sessionID } });

    } catch (error) {
        console.error('Error fetching films:', error);
        res.status(500).send('Internal Server Error');
    }

});

// open index page on specific film
router.get('/index', async function (req, res) {
    try{

        hasUserInteracted = false;
        var page = req.query.page;
        var tconst = req.query.tconst;

        res.render('index', { title: 'Express', session: { email: req.cookies.sessionEmail, id: req.cookies.sessionID, tconst: tconst, page: page} });

    }catch (error){
        console.error('Error opening index page on film', error)
        res.status(500).send('Internal Server Error');

    }

});

// Return liked attributes for specified film
router.get('/getLikedFilms', (req, res) => {
    const userid = req.query.user_id;

    // Query database to retrieve liked elements for the specified film
    getConnection(async (err, connection) => {
        if (err) {
            throw err;
        }

        try {
            const filmsQuery = `
                (SELECT tconst FROM user_liked_attributes WHERE user_id = ?)
                UNION
                (SELECT tconst FROM user_liked_cast WHERE user_id = ?)
            `;

            connection.query(filmsQuery, [userid, userid], (err, results) => {
                if (err) {
                    throw err;
                }
                res.send(results);
            });
        } catch (error) {
            console.error('Error retrieving liked films:', error);
            res.status(500).send('Error retrieving liked films.');
        } finally {
            // Release the database connection
            connection.release();
        }
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

});

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
                });

            }

        });

        const searchCastQuery = `SELECT * FROM user_liked_cast WHERE user_id = ? AND tconst = ?`;
        await connection.query(searchCastQuery, [userid, tconst], async (err, castResult) => {
            if (err) throw (err)

            if (castResult.length > 0) {
                const deleteCastQuery = `DELETE FROM user_liked_cast WHERE user_id = ? AND tconst = ?`;

                await connection.query(deleteCastQuery, [userid, tconst], (err, result) => {
                    if (err) throw (err)
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
    hasUserInteracted = true;

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

    hasUserInteracted = true;

    res.send('Removed succesfully')

});

//save liked elements AND cast members
router.post('/saveLikedElements', (req, res) => {

    const userid = req.body.user_id;
    const tconst = req.body.film_id;
    const likedElements = req.body.elements;
    const likedCast = req.body.cast;

    const attributeValues = {
        Title: 0,
        Plot: 0,
        Rating: 0,
        Genre: 0,
        Runtime: 0,
        Year: 0,
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

        var deleteQuery = `DELETE FROM user_liked_attributes WHERE user_id = ? AND tconst = ?`;
        await connection.query(deleteQuery, [userid, tconst], async (err, deleteResult) => {
            if (err) throw (err);

            if (likedElements.length > 0) {
                const insertQuery = `INSERT INTO user_liked_attributes (user_id, tconst, Title, Plot, Rating, Genre, Runtime, Year, Director, Camera, Writer, Producer, Editor, Composer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                await connection.query(insertQuery, [userid, tconst, ...Object.values(attributeValues)], (err, result) => {
                    if (err) throw (err)

                    console.log('Saved elements')

                });

            }
        });

        var deleteQuery = `DELETE FROM user_liked_cast WHERE user_id = ? AND tconst = ?`;
        await connection.query(deleteQuery, [userid, tconst], (err, deleteResult) => {
            if (err) throw (err);

            if (likedCast.length > 0) {
                const castQuery = `INSERT INTO user_liked_cast (user_id, tconst, name) VALUES ?`;
                const tableValues = likedCast.map(castMember => [userid, tconst, castMember]);
                connection.query(castQuery, [tableValues], (err, insertResult) => {
                    if (err) throw (err);
                    console.log('Saved cast');
                });
            }

        });

        connection.release()
    });

    hasUserInteracted = true;
    res.send('Data saved successfully'); //send response

});

//return liked elements AND cast members
router.get('/getLikedElements', function (req, res) {

    const userid = req.query.user_id;
    const film_id = req.query.film_id;

    // Query database to retrieve liked elements and actors for the specified film
    getConnection(async (err, connection) => {
        if (err) throw (err);

        try {
            // Perform the first database query to retrieve liked attributes
            const findFilmQuery = `SELECT Title, Plot, Rating, Genre, Runtime, Year, Director, Camera, Writer, Producer, Editor, Composer FROM user_liked_attributes WHERE user_id = ? AND tconst = ?`;
            await connection.query(findFilmQuery, [userid, film_id], async (err, filmResults) => {
                if (err) throw (err)

                const elements = [];
                if (filmResults.length > 0) {
                    filmResults.forEach(result => {
                        Object.keys(result).forEach(key => {
                            if (result[key] === 1) {
                                elements.push(key);
                            }
                        });
                    });
                }

                const findCastQuery = `SELECT name FROM user_liked_cast WHERE user_id = ? AND tconst = ?`;
                await connection.query(findCastQuery, [userid, film_id], async (err, castResults) => {
                    if (err) throw (err)

                    const cast = [];
                    if (castResults.length > 0) {
                        castResults.forEach(row => {
                            cast.push(row.name);
                        });
                    }

                    res.send({ likedElements: elements, likedCast: cast })

                });

            });

        } catch (error) {
            console.error(error);
            res.status(500).send('Error retrieving liked data.');
        } finally {
            // Release the database connection
            connection.release();
        }
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

router.get('/hasUserInteracted', function (req, res) {

    res.json({ hasUserInteracted });
    hasUserInteracted = false;

})

//user logs out
router.post('/signout', function (req, res) {

    //clear session
    res.clearCookie('sessionEmail');
    res.clearCookie('sessionID');
    req.session.destroy();
    console.log("--------> User signed out");
    res.redirect('index');

});


module.exports = router;
