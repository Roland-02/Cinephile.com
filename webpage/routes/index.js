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

        res.render('index', { title: 'Express', session: { email: req.cookies.sessionEmail }, films: films });


    } catch (error) {
        console.error('Error fetching films:', error);
        res.status(500).send('Internal Server Error');
    }

});


// POST route to handle saving liked elements
router.post('/saveLiked', (req, res) => {

    const likedElements = req.body.liked;
    const tconst = req.body.filmid;
    const userEmail = req.body.user

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

        const searchUserQuery = `SELECT user_id FROM user_login WHERE email = '${userEmail}'`;

        await connection.query(searchUserQuery, async (err, userResult) => {

            if (err) throw (err)

            const userid = userResult[0].user_id;

            const insertQuery = `INSERT INTO user_films (user_id, tconst, title, plot, rating, genre, runtime, year, cast, director, camera, writer, producer, editor, composer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                ON DUPLICATE KEY UPDATE 
                                title = VALUES(title), 
                                plot = VALUES(plot), 
                                rating = VALUES(rating), 
                                genre = VALUES(genre), 
                                runtime = VALUES(runtime), 
                                year = VALUES(year), 
                                cast = VALUES(cast), 
                                director = VALUES(director), 
                                camera = VALUES(camera), 
                                writer = VALUES(writer), 
                                producer = VALUES(producer), 
                                editor = VALUES(editor), 
                                composer = VALUES(composer)`;

            await connection.query(insertQuery, [userid, tconst, ...Object.values(attributeValues)], (err, result) => {

                if (err) throw (err)

                connection.release()
                console.log("--------> Saved likes");
            });

        });

    });

    res.send('Data saved successfully'); //send response

});


router.post('/signout', function (req, res) {
    res.clearCookie('sessionEmail')
    req.session.destroy();
    res.redirect('index');
});


module.exports = router;
