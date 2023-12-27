//handle POST and GET request for /login

var express = require('express');
var router = express.Router();
const mysql = require('mysql');
var { getConnection } = require('../database');
var bcrypt = require('bcrypt');
const session = require('express-session');


//get request - open login.ejs page
router.get('/', function (req, res, next) {
    res.render('login', { title: 'Express', session: req.session, message: null, email: null });
});

//post request - user wants to login
router.post('/', async (req, res) => {

    const email = req.body.email;
    const password = req.body.password;

    if (!email || !password) {
        //empty fields
        return res.render('login', { title: 'Express', session: req.session, message: null, email: null });
    }

    getConnection(async (err, connection) => {

        if (err) throw (err)
        const sqlSearch = "SELECT * FROM user_login WHERE email = ?";
        const search_query = mysql.format(sqlSearch, [email]);

        await connection.query(search_query, async (err, result) => {

            if (err) throw (err);

            console.log("------> Search Results");
            console.log(result.length);

            if (result.length == 0) {
                connection.release();
                console.log("------> User not found");
                return res.render('login', { title: 'Express', session: req.session, message: 'User not found' });

            
            } else {
                let dbPassword = result[0].password;
                bcrypt.compare(password, dbPassword, (err, isMatch) => {
                    if (err) throw err;

                    if (isMatch) {
                        //successful login
                        connection.release()
                        res.cookie('sessionEmail', req.session.email); // Store email in a cookie
                        return res.redirect('index');
                    }
                    else {
                        //credentials incorrect
                        connection.release()
                        console.log("--------> Credentials incorrect")
                        return res.redirect('login')

                    }

                });
            };

        });
    });
    //end of getConnection
});
//end of post request


module.exports = router;
