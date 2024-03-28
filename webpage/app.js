const express = require('express');
const app = express();
require("dotenv").config();
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');


//set the view engine to ejs specify the views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


//middleware to be used by application
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use(cookieParser());


//allow additional files to be read
app.use('/styles', express.static(path.join(__dirname, 'styles'), { type: 'application/css' }));
app.use('/bootstrap/js', express.static(path.join(__dirname, 'js'), { type: 'application/javascript' }));
app.use('/scripts', express.static(path.join(__dirname, 'scripts'), { type: 'application/javascript' }));


//for sessions
const timeout = 1000 * 60 * 60; //1 hour
app.use(session({
  secret: process.env.SECRET,
  saveUninitialized: true,
  resave: false,
  cookie: {
    maxAge: timeout,
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

var recommendRoute = require('./routes/recommend');
app.use('/recommend', recommendRoute);

var profileRoute = require('./routes/profile');
app.use('/profile', profileRoute);

var watchlistRoute = require('./routes/watchlist');
app.use('/watchlist', watchlistRoute);

var filmsRouter = require('./routes/films');
app.use(filmsRouter);


//start server
const port = process.env.PORT
app.listen(port, () => console.log(`Server Started on port ${port}...`));

