//REQUIRE IN EXPRESS AND EXPRESS ROUTER TO CREATE ROUTES TO REQUIRE IN APP.JS
var express = require('express')
var router = express.Router()

//REQUIRE IN MODELS
var Models = require('./models/models')
var User = Models.User
var Request = Models.Request

// redirect to login if not signed in
router.use(function(req, res, next){
  if (!req.user) {
    res.redirect('/login');
  } else {
    return next();
  }
});

// load screen, different if admin
router.get('/', function(req, res) {
  User.findById(req.user._id).then(
    (user) => {
      res.send('exists!')
    },
    (err) => {
      res.status(500).send('Database Error: "/"')
    }
  )
});
module.exports = router
