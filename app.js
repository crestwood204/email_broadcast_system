var express = require('express');
var exphbs  = require('express-handlebars');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var path = require('path');
var logger = require('morgan');
var session = require('express-session')
var cookieParser = require('cookie-parser');
var passport = require('passport');
var LocalStrategy = require('passport-local');
var MongoStore = require('connect-mongo')(session);
var models = require('./models/models');
var auth = require('./routes/auth');
var routes = require('./routes/routes');
var edit_routes = require('./routes/edit_routes');

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
app.engine('.hbs', exphbs({
  defaultLayout: 'main',
  extname: '.hbs',
  helpers:{
    // Function to do basic mathematical operation in handlebar
    math: function(lvalue, operator, rvalue) {
      lvalue = parseFloat(lvalue);
      rvalue = parseFloat(rvalue);
      return {
          "+": lvalue + rvalue,
          "-": lvalue - rvalue,
          "*": lvalue * rvalue,
          "/": lvalue / rvalue,
          "%": lvalue % rvalue
    }[operator];
    },
    // Function to check equality
    compare: function(lvalue, rvalue, options) {
      var operator = options.hash.operator || "==";

      var operators = {
          '==':       function(l,r) { return l == r; },
          '===':      function(l,r) { return l === r; },
          '!=':       function(l,r) { return l != r; },
          '<':        function(l,r) { return l < r; },
          '>':        function(l,r) { return l > r; },
          '<=':       function(l,r) { return l <= r; },
          '>=':       function(l,r) { return l >= r; },
          'typeof':   function(l,r) { return typeof l == r; }
      }

      if (!operators[operator])
          throw new Error("Handlerbars Helper 'compare' doesn't know the operator "+operator);

      var result = operators[operator](lvalue,rvalue);

      if (result) {
          return options.fn(this);
      } else {
          return options.inverse(this);
      }
    }
  }
}));
app.set('view engine', 'hbs');
app.use(express.static(path.join(__dirname, 'public')));

// add middleware to parse body requests and log requests
app.use(logger('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser(process.env.SECRET))

// Passport - Session Middleware for Authentication
app.use(session({
    secret: process.env.SECRET,
    name: 'session',
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
    proxy: true,
    resave: true,
    saveUninitialized: true
}));

passport.serializeUser(function(user, done) {
  done(null, user._id);
});

passport.deserializeUser(function(id, done) {
  models.User.findById(id, function(err, user) {
    done(err, user);
  });
});

// passport strategy
passport.use(new LocalStrategy({
  passReqToCallback : true
}, function(req, username, password, done) {
    // Find the user with the given username
    models.User.findOne({ "username": username }, function (err, user) {
      // if there's an error, finish trying to authenticate (auth failed)
      if (err) {
        console.error(err);
        return done(err);
      }
      // if no user present, auth failed
      if (!user) {
        console.log('user: ' + username + ' does not exist')
        return done(null, false, { message: 'Incorrect username or password' });
      }
      // if passwords do not match, auth failed
      if (user.password !== password) {
        return done(null, false, { message: 'Incorrect username or password' });
      }

      // if user is deactivated, auth failed
      if (!user.active) {
        return done(null, false, { message: 'User is not active' });
      }
      // auth has succeeded
      return done(null, user);
    });
  }
));

app.use(passport.initialize());
app.use(passport.session());

// include routes to use
app.use('/', auth(passport));
app.use('/', routes);
app.use('/', edit_routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  console.log('error handler')
  // render the error page
  res.status(err.status || 500);
  res.render('error', { 'user': req.user });
});

app.listen(port, function () {
  console.log('Listening on port ' + port);
});
