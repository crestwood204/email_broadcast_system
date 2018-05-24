//REQUIRE IN EXPRESS AND EXPRESS ROUTER TO CREATE ROUTES TO REQUIRE IN APP.JS
var express = require('express')
var router = express.Router()

//REQUIRE IN MODELS
var Models = require('../models/models')
var User = Models.User
var Request = Models.Request
var Log = Models.Log
var Group = Models.Group

// redirect to login if not signed in
router.use(function(req, res, next) {
  if (!req.user) {
    res.redirect('/login');
  } else {
    return next();
  }
});

// load screen
router.get('/', function(req, res) {
  User.findById(req.user._id).then(
    (user) => {
      res.render('home', {'request': req.query.request})
    },
    (err) => {
      res.status(500).send('Database Error: "/"')
    }
  )
});

router.get('/new_request', function(req, res) {
  // want to render home with appropriate email groups
  res.render('new_request')
})

router.post('/new_request', function(req, res) {
  var to = req.body.toField
  var subject = req.body.subject
  var body = req.body.body
  if (typeof to === 'object') {
    console.log('object')
  } else {
    console.log('string')
  }
  res.redirect('/?request=true')
})

module.exports = router
