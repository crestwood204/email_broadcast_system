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
      failureRedirect: '/login?error=true'
    }), function(req, res) {
      res.redirect(req.session.returnTo || '/')
      delete req.session.returnTo
    }
  );

  // handles user logout
  router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/login');
  });

  return router;
}
