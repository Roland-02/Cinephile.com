//handle POST and GET request for /login

var express = require('express');
var router = express.Router();
const mysql = require('mysql');
var { getConnection } = require('../database');
var bcrypt = require('bcrypt');


//get request - open login.ejs page
router.get(['/','/login', '/signin'], function (req, res) {
    res.render('login', { title: 'Express', session: req.session, message: null, email: null, id: null});
});

//post request - user wants to login
router.post('/', async (req, res) => {

    const email = req.body.email;
    const password = req.body.password;

    if (!email || !password) {
        //empty fields
        return res.render('login', { title: 'Express', session: req.session, message: null, email: null, id: null});
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
                bcrypt.compare(password, dbPassword, (err, isMatch) => {
                    if (err) throw err;

                    if (isMatch) {
                        //successful login
                        let user_id = result[0].user_id
                        connection.release()
                        console.log('--------> User login')
                        res.cookie('sessionEmail', email); // Store email in a cookie
                        res.cookie('sessionID', user_id);
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
