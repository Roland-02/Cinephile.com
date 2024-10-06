//handle POST and GET request for /login

var express = require('express');
const router = express.Router();
const mysql = require('mysql');
var { getConnection } = require('../database');
var bcrypt = require('bcrypt');
const axios = require('axios');


async function updateProfileAndVectors(userId) {
    await axios.post(`http://127.0.0.1:8081/update_profile_and_vectors?user_id=${userId}`, {
    })
        .then(function (response) {
            console.log(response.data.message);
        })
        .catch(function (error) {
            console.log(error);
        });
}


async function cacheRecommendedFilms(user_id) {
    //load batch of films from file
    await axios.post(`http://127.0.0.1:8081/cache_recommend_pack?user_id=${user_id}`, {
    })
        .then(function (response) {
            console.log(response.data.message);
        })
        .catch(function (error) {
            console.log(error);
        });

};


async function updateProfileLoadFilms(user_id) {
    try {
        console.log('Loading profile');
        await updateProfileAndVectors(user_id);
        console.log('Loading films')
        await cacheRecommendedFilms(user_id);

    } catch (error) {
        console.error('Error starting engine or updating profile:', error);
    }
}


//get request - open login.ejs page
router.get(['/', '/login', '/signin'], function (req, res) {
    res.render('login', { title: 'Express', session: req.session, message: null, email: null, id: null });
});

//post request - user wants to login
router.post('/', async (req, res) => {

    const email = req.body.email;
    const password = req.body.password;

    if (!email || !password) {
        //empty fields
        return res.render('login', { title: 'Express', session: req.session, message: null, email: null, id: null });
    }

    getConnection(async (err, connection) => {

        if (err) throw (err)
        const sqlSearch = "SELECT * FROM user_login WHERE email = ?";
        const search_query = mysql.format(sqlSearch, [email]);

        await connection.query(search_query, async (err, result) => {

            if (err) throw (err);

            if (result.length == 0) {
                connection.release();
                console.log('--------> User not found');
                return res.render('login', { title: 'Express', session: req.session, message: 'User not found' });

            } else {
                let dbPassword = result[0].password;
                bcrypt.compare(password, dbPassword, async (err, isMatch) => {
                    if (err) throw err;

                    if (isMatch) {
                        //successful login
                        let user_id = result[0].user_id
                        connection.release()
                        console.log('--------> User login')
                        res.cookie('sessionEmail', email); // Store email in a cookie
                        res.cookie('sessionID', user_id);

                        await updateProfileLoadFilms(user_id);

                        return res.redirect('index');
                    }
                    else {
                        //credentials incorrect
                        connection.release()
                        return res.render('login', { title: 'Express', session: req.session, message: 'Credentials incorrect' });

                    }

                });
            };

        });
    });
    //end of getConnection

});
//end of post request


module.exports = router;

