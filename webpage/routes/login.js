//handle POST and GET request for /login

var express = require('express');
var router = express.Router();
const mysql = require('mysql');
var { getConnection } = require('../database');
var bcrypt = require('bcrypt');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');

let pythonServerProcess;

// // Function to stop the Python server
// function stopEngine() {
//   if (pythonServerProcess) {
//       pythonServerProcess.kill('SIGINT'); // Send the interrupt signal to terminate the process
//       pythonServerProcess = null;
//       console.log('Engine stopped')
//   }
// }

async function startRecommendEngine() {
    return new Promise((resolve, reject) => {
        const pythonScriptPath = path.resolve(__dirname, './recommendEngine.py');
        pythonServerProcess = spawn('python', [pythonScriptPath]);

        // Listen for standard output
        pythonServerProcess.stdout.on('data', function (data) {
            console.log('Python server:', data.toString());
            resolve()
        });

    });
}


async function updateProfileAndVectors(userId) {
    await axios.post(`http://127.0.0.1:5000/update_profile_and_vectors?user_id=${userId}`, {
    })
        .then(function (response) {
            console.log(response.data.message);
        })
        .catch(function (error) {
            console.log(error);
        });
}


async function startEngineAndProfileUpdate(user_id) {
    try {
        console.log('Starting engine...');
        await startRecommendEngine();
        console.log('Engine started');
        console.log('Loading profile...');
        await updateProfileAndVectors(user_id);
        console.log('Profile loaded');

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

                        await startEngineAndProfileUpdate(user_id);

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

