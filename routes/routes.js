//REQUIRE IN EXPRESS AND EXPRESS ROUTER TO CREATE ROUTES TO REQUIRE IN APP.JS
var express = require('express')
var router = express.Router()

//REQUIRE IN MODELS
var Models = require('./models/models')
var User = Models.User
var Request = Models.Request

// redirect to login
router.get('/', function(req, res) {
  res.redirect('/login')
})

// load login page
router.get('/login', function(req, res) {
    res.render('login')
})

// handles user login, redirecting based on user type
router.post('/login', function(req, res) {
  var username = req.body.username
  var password = req.body.password

  User.findOne({username: username, password: password}).then(
    (user) => {
      if (user.approver) {
        res.redirect('view') // TODO: should be sending user submissions through
      } else {
        res.redirect('view')
      }
    },
    (err) => {
      res.status(400).send('unauthorized')
    }
  )
})

router.get('/view', function(req, res) {

})

module.exports = router
