// include modules for endpoint processing
const express = require('express');
const bodyParser = require('body-parser');

// include modules for view engine
const exphbs = require('express-handlebars');
const helpers = require('./helpers/handlebars_helpers');

// include system modules
const path = require('path');

// include debug modules
const logger = require('morgan');

// include session, cookies, authentication modules
const session = require('express-session');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local');

// include modules for database
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo')(session);

// include routes and models
const models = require('./models/models');
const routes = require('./routes/routes');


// check if MONGODB_URI environmental variable is present
if (!process.env.MONGODB_URI || !process.env.SECRET) {
  console.log('ERROR: environmental variables missing, remember to source your env.sh file!');
}

// start connection to MONGODB
mongoose.connect(encodeURIComponent(process.env.MONGODB_URI)).then(
  () => {
    console.log('connected to mongoDB');
    models.User.find({}).then((users) => {
      if (!users[0]) {
        const newUser = new models.User({
          username: 'anong',
          password: 'test',
          approver: 'true',
          email: 'andrew.ong@rothmaninstitute.com',
          active: true
        });
        newUser.save((err, user) => {
          if (err) {
            console.log('error creating first user');
          } else {
            console.log('created user', user);
          }
        });
      }
    });
  },
  (err) => {
    console.log('err', err);
  }
);

mongoose.connection.on('error', (err) => {
  console.log('MONGODB_ERROR:', err);
});

// create server with express: port defaults to 3000
const app = express();
const port = process.env.PORT || 3000;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine('.hbs', exphbs({
  defaultLayout: 'main',
  extname: '.hbs',
  helpers: {
    math: helpers.math,
    compare: helpers.compare,
    substring: helpers.substring,
    chain: helpers.chain
  }
}));
app.set('view engine', 'hbs');
app.use(express.static(path.join(__dirname, 'public')));

// add middleware to parse body requests and log requests
app.use(logger('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser(process.env.SECRET));

// Passport - Session Middleware for Authentication
app.use(session({
  secret: process.env.SECRET,
  name: 'session',
  store: new MongoStore({ mongooseConnection: mongoose.connection }),
  proxy: true,
  resave: true,
  saveUninitialized: true
}));

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser((id, done) => {
  models.User.findById(id, (err, user) => {
    done(err, user);
  });
});

// passport strategy
passport.use(new LocalStrategy({ passReqToCallback: true }, ((req, username, password, done) => {
  // Find the user with the given username
  models.User.findOne({ username }, (err, user) => {
    // if there's an error, finish trying to authenticate (auth failed)
    if (err) {
      console.error('passport localStrategy database_error', err);
      return done(err);
    }
    req.session.customErr = username;
    // if no user present, auth failed
    if (!user) {
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
    return done(null, user);
  });
})));

app.use(passport.initialize());
app.use(passport.session());

// include routes to use
app.use('/', routes.AUTH_ROUTES(passport)); // authentication routes
app.use('/', routes.BROADCAST_ROUTES); // broadcast routes
app.use('/', routes.SETTINGS);
app.use('/', routes.APPROVER_ROUTES); // routes that are approver-only after this point

// routes that edit users, groups, or templates
app.use('/', routes.USER_ROUTES);
app.use('/', routes.GROUP_ROUTES);
app.use('/', routes.TEMPLATE_ROUTES);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use((err, req, res) => {
  console.log('error handler', err);
  // render the error page
  res.status(err.status || 500);
  res.render('error', { user: req.user });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
