// require express to create the server
var express = require('express');

// require handlebars for the view engine
var exphbs  = require('express-handlebars');

// require body parser for middleware
var bodyParser = require('body-parser');

// require mongoose for mongodb connection
var mongoose = require('mongoose');

// require path to link hbs files
var path = require('path');

// check if MONGODB_URI environmental variable is present
if (!process.env.MONGODB_URI) {
  console.log('ERROR: environmental variables missing, remember to source your env.sh file!');
}

// start connection to MONGODB
mongoose.connect(process.env.MONGODB_URI).then(
 ()=>{
   console.log("connected to mongoDB")},
 (err)=>{
     console.log("err", err);
 })
mongoose.connection.on('error', function(err) {
    console.log('MONGODB_ERROR: ' + err);
});

// create server with express: port defaults to 3000
var app = express();
var port = process.env.PORT || 3000;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine('.hbs', exphbs({extname: '.hbs'}));
app.set('view engine', 'hbs');
app.use(express.static(path.join(__dirname, 'public')));

// add body parser to middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//REQUIRE IN ROUTES FROM ROUTES.JS
var routes = require('./routes');

// include routes to use
app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.listen(port, function () {
  console.log('Listening on port ' + port);
});
