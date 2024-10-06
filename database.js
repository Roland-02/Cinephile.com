//MYSQL database connection
const mysql = require('mysql');
require("dotenv").config();

// database connection
const db = mysql.createPool({
    connectionLimit: 10000,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT
});

function getConnection(callback) {
    db.getConnection((err, connection) => {
        if (err) throw (err)
        //console.log("DB connected successfully")
        callback(err, connection);
    });

};


module.exports.getConnection = getConnection;

