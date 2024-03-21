//handle POST and GET request for /createAccount
var express = require('express');
var router = express.Router();
const mysql = require('mysql');
var { getConnection } = require('../database');
var bcrypt = require('bcrypt');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');


let pythonServerProcess;

// Function to stop the Python server
function stopEngine() {
  if (pythonServerProcess) {
      pythonServerProcess.kill('SIGINT'); // Send the interrupt signal to terminate the process
      pythonServerProcess = null;
      console.log('Engine stopped')
  }
}


function startRecommendEngine() {
    return new Promise((resolve, reject) => {
        const pythonScriptPath = path.resolve(__dirname, './recommendEngine.py');
        let pythonServerProcess = spawn('python', [pythonScriptPath]);

        // Listen for standard output
        pythonServerProcess.stdout.on('data', function(data) {
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
        // console.log('Loading profile...');
        // await updateProfileAndVectors(user_id);
        // console.log('Profile loaded');
    } catch (error) {
        console.error('Error starting engine or updating profile:', error);
    }
}


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
        const sqlInsert = "INSERT INTO user_login (user_id, email, password) VALUES (0,?,?)"
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
                await connection.query(insert_query, async (err, result) => {
                
                    if (err) throw (err)

                    let user_id = result.insertId //user_id always matches insert id
                    res.cookie('sessionID', user_id);
                    res.cookie('sessionEmail', email); // Store email in a cookie
                    console.log("--------> Created new User");

                    await startEngineAndProfileUpdate(user_id);

                    connection.release()

                    return res.redirect('index');
                });                
            }
        });
    });
    //end of getConnection
});
//end of post request

// module.exports = { stopEngine }; // Export stopEngine function for use in other files
module.exports = router;
