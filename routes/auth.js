// Add Passport-related auth routes here.

var express = require('express');
var router = express.Router();
var models = require('../models/models');


module.exports = function(passport) {
  // load login page
  router.get('/login', function(req, res) {

    console.log(req.flash('loginmessage'))
    console.log(req.flash('loginmessage')[0])
    res.render('login', { message: req.flash('loginMessage')[0] })
  })

  // handles user login, redirecting based on user type
  router.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
  }));

  // handles user logout
  router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/login');
  });

  return router;
}
