// Add Passport-related auth routes here.

var express = require('express');
var router = express.Router();
var models = require('../models/models');


module.exports = function(passport) {
  // load login page
  router.get('/login', function(req, res) {
    res.render('login', {layout: false, "error": req.query.error})
  })

  // handles user login, redirecting based on user type
  router.post('/login', passport.authenticate('local', {
      successRedirect: '/',
      failureRedirect: '/login?error=true'
    }));

  // handles user logout
  router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/login');
  });

  return router;
}
