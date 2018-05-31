var express = require('express')
var router = express.Router()

//REQUIRE IN MODELS
var Models = require('../models/models')
var User = Models.User
var Request = Models.Request
var Log = Models.Log
var Group = Models.Group

router.use('/', function(req, res, next) {
  if (req.user.approver) {
    return next();
  } else {
    res.send('no_access') //TODO: FIX THIS!!!
  }
})

router.get('/edit_users', function(req, res) {
    var update = undefined
    var success = undefined
    var failed = undefined
    var deactivate = undefined
    if (req.query.request === 'success') {
      success = true
    }
    if (req.query.request === 'failed') {
      failed = true
    }
    if (req.query.update === 'true') {
      update = true
    }
    if (req.query.deactivate === 'true') {
      deactivate = true
    }
    User.find({}).then(
      (users) => {
        res.render('edit_views/edit_users', {'users': users, 'success': success, 'failed': failed, 'update': update, 'deactivate': deactivate, 'approver': req.user.approver})
      },
      (err) => {
        console.log('edit_users fetch database_error')
      }
    )
})

router.get('/new_user', function(req, res) {
  var msg = undefined
  if (req.query.missing) {
    msg = 'One or more required parameters are blank'
  }

  if (req.query.password_failed) {
    msg = 'Passwords did not match'
  }

  if (req.query.database_error) {
    msg = 'Something went wrong with the database! Your request cannot be fufilled at this time.'
  }

  if (req.query.username_taken) {
    msg = "Username is taken. Please choose a different username"
  }
  res.render('edit_views/new_user', {'approver': req.user.approver, 'msg': msg})
})

router.post('/new_user', function(req, res) {
  var username = req.body.username
  var email = req.body.email
  var password = req.body.password
  var confirm_password = req.body.confirm_password
  var approver = false
  if (req.body.approver) {
    approver = true
  }
  if (!username || !email || !password || !confirm_password) {
    res.redirect('/new_user?missing=true')
  } else if (password !== confirm_password) {
    res.redirect('/new_user?password_failed=true')
  } else {
    User.findOne({'username': username}, function(err, user) {
      if (err) {
        console.log('new_user username_lookup database_error')
        res.redirect('/new_user?database_error=true')
      } else if (user) {
        res.redirect('/new_user?username_taken=true')
      } else {
        var new_user = new User({
          'username': username,
          'email': email,
          'password': password,
          'approver': approver
        })

        new_user.save(function(err, user) {
          if (err) {
            console.log('new_user save database_error')
            res.redirect('/new_user?database_error=true')
          } else {
            res.redirect('/edit_users?request=success')
          }
        })
      }
    })
  }
})

router.get('/edit_user', function(req, res) {
  User.findOne({'username': req.query.user}, function(err, user) {
    if (err) {
      console.log('edit_user user_lookup database_error')
      res.redirect('/edit_users', 'request=failed')
    } else {
      if (!user) {
        res.redirect('/edit_users?request=failed')
      } else {
          res.render('edit_views/edit_user', {'user': user, 'approver': req.user.approver})
      }
    }
  })
})

router.post('/edit_user', function(req, res) {
  var username = req.body.username
  var email = req.body.email
  var password = req.body.password
  var approver = false
  if (req.body.approver) {
    approver = true
  }

  User.findOneAndUpdate({ 'username': username }, { $set: {
    'username': username,
    'email': email,
    'password': password,
    'approver': approver
  }}, function(err, user) {
    if (err) {
      console.log('edit_user post_edit database_error')
      res.redirect('/edit_users?request=failed')
    } else {
      // make a log
      res.redirect('/edit_users?update=true')
    }
  })
})

router.put('/deactivate_user', function(req, res) {
  console.log('hi')
  var username = req.body.username

  User.findOneAndUpdate({ 'username': username }, { $set: {
    'active': false
  }}, function(err, user) {
    res.status(200).send('user deactivated')

    // make log
  })
})

router.get('/edit_groups', function(req, res) {
    res.render('edit_views/edit_groups', {'approver': req.user.approver})
})

module.exports = router
