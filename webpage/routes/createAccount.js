//handle POST and GET request for /createAccount
var express = require('express');
var router = express.Router();
const mysql = require('mysql');
var { getConnection } = require('../database');
var bcrypt = require('bcrypt');


//get request - open createAccount.ejs page
router.get(['/','/createAccount'], function (req, res, next) {
    res.render('createAccount', { title: 'Express', session: req.session, message: null, email: null, id: null });
});

//post request - user wants to create again
router.post('/', async (req, res) => {

    const email = req.body.email;
    const password = req.body.password;

    if (!email || !password) {
        //empty fields
        return res.redirect('createAccount');
    }

    const hashPassword = await bcrypt.hash(password, 10);

    getConnection(async (err, connection) => {


        if (err) throw (err)
        const sqlSearch = "SELECT * FROM user_login WHERE email = ?"
        const search_query = mysql.format(sqlSearch, [email])
        const sqlInsert = "INSERT INTO user_login (id, email, password) VALUES (0,?,?)"
        const insert_query = mysql.format(sqlInsert, [email, hashPassword])

        await connection.query(search_query, async (err, result) => {

            if (err) throw (err)

            if (result.length != 0) {
                //user already exists: error
                connection.release();
                console.log("------> User already exists");
                return res.render('createAccount', { title: 'Express', session: req.session, message: 'User already exists' });

            }
            else {
                //create new user
                await connection.query(insert_query, (err, result) => {
                
                    if (err) throw (err)

                    connection.release()
                    let user_id = result[0].user_id
                    res.cookie('sessionID', user_id);
                    res.cookie('sessionEmail', email); // Store email in a cookie
                    console.log("--------> Created new User");
                    return res.redirect('index');
                });                
            }
        });
    });
    //end of getConnection
});
//end of post request

module.exports = router;
