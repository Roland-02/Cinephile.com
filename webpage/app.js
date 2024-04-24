const express = require('express');
const app = express();
require("dotenv").config();
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const cors = require('cors');


// Enable CORS for all origins

//set the view engine to ejs specify the views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

//middleware to be used by application
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use(cookieParser());
app.use(cors());

//allow additional files to be read
app.use('/styles', express.static(path.join(__dirname, 'styles'), { type: 'application/css' }));
app.use('/bootstrap/js', express.static(path.join(__dirname, 'js'), { type: 'application/javascript' }));
app.use('/bootstrap/css', express.static(path.join(__dirname, 'css'), { type: 'application/css' }));
app.use('/scripts', express.static(path.join(__dirname, 'scripts'), { type: 'application/javascript' }));

//for sessions
const timeout = 86400; //1 day
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

var searchRoute = require('./routes/search');
app.use('/search', searchRoute);

var filmsRouter = require('./routes/films');
app.use(filmsRouter);


// start pytohn flask server
async function startRecommendEngine() {
  return new Promise((resolve, reject) => {
    const pythonScriptPath = path.resolve(__dirname, './routes/recommendEngine.py');
    const pythonServerProcess = spawn('python', [pythonScriptPath]);

    // Listen for standard output
    pythonServerProcess.stdout.on('data', function (data) {
      console.log('Flask server:', data.toString());
      resolve();
    });

    // Listen for errors
    pythonServerProcess.stderr.on('data', function (data) {
      console.error('Flask server:', data.toString());
      reject(data.toString());
    });

  });

}


// start the recommendation and web server together 
async function startServers() {
  try {
    // Start the recommendation engine
    await startRecommendEngine();
    console.log('Flask server started successfully.');

    // Start the web server
    const port = process.env.PORT;
    app.listen(port, () => console.log(`Web server started, page accessible here http://localhost:${port}`));

  } catch (error) {
    console.error('Failed to start servers:', error);
  }

}


startServers()
  
