//application file

//add HTTPS

const express = require('express');
const app = express();
require("dotenv").config();
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');


const bodyParser = require('body-parser');
app.use(bodyParser.json());


// Set the view engine to ejs specify the views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use(cookieParser());


//allow additional files to be read
app.use('/styles', express.static(path.join(__dirname, 'styles'), { type: 'application/css' }));
app.use('/js', express.static(path.join(__dirname, 'js'), { type: 'application/javascript' }));
//end of files


//for sessions
const oneDay = 1000 * 60 * 60 * 24;
app.use(session({
  secret: process.env.SECRET,
  saveUninitialized: true,
  resave: false,
  cookie: {
    maxAge: oneDay,
    secure: true
  }
}));


//url routes - links to seperate files where specific requests are handled

var indexRoute = require('./routes/index');
app.use('/', indexRoute);

var createAccountRoute = require('./routes/createAccount');
app.use('/createAccount', createAccountRoute);

var loginRoute = require('./routes/login');
app.use('/login', loginRoute);


//end of routes






//start server

const port = process.env.PORT
app.listen(port,
  () => console.log(`Server Started on port ${port}...`))




