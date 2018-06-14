var express = require('express')
var router = express.Router()

//REQUIRE IN MODELS
var Models = require('../../models/models')
var User = Models.User
var Request = Models.Request
var Log = Models.Log
var Group = Models.Group
var Template = Models.Template

router.get('/edit_users', function(req, res) {
  var messages = {
    'database': 'The database failed to respond to this request. Please try again or contact IT for support.',
    'not_found': 'User could not be found in the database! Please try again or contact IT for help.',
    'deactivated': 'User deactivated successfully!',
    'activated': 'User activated successfully',
    'updated': 'User updated succesfully!',
    'created': 'User created successfully!'
  }
  var request = req.query.request
  var alert_msg = null
  if (request) {
    alert_msg = messages[req.query.type]
  }
  User.find({}).then(
    (users) => {
      users.sort(function(a, b) {
        return ('' + a.username).localeCompare(b.username);
      })
      res.render('edit_views/user/edit_users', { 'users': users, 'request': request, 'alert_msg': alert_msg, 'user': req.user })
    },
    (err) => {
      console.log('edit_users fetch database_error')
    }
  )
})

router.get('/new_user', function(req, res) {
  var messages = {
    'username_taken': "Username is taken. Please choose a different username.",
    'password_match': 'Passwords did not match',
    'database': 'The database failed to respond to this request. Please try again or contact IT for support.',
    'missing_fields': 'One or more fields are missing. Please complete the form before submitting'
  }
  var request = req.query.request
  var alert_msg = null
  if (request) {
    alert_msg = messages[req.query.type]
  }
  res.render('edit_views/user/new_user', {'user': req.user, 'request': request, 'alert_msg': alert_msg})
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
    res.redirect('/new_user?request=failure&type=missing_fields')
  } else if (password !== confirm_password) {
    res.redirect('/new_user?request=failure&type=password_match')
  } else {
    User.findOne({'username': username}, function(err, user) {
      if (err) {
        console.log('new_user username_lookup database_error')
        res.redirect('/new_user?request=failure&type=database')
      } else if (user) {
        res.redirect('/new_user?request=failure&type=username_taken')
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
            res.redirect('/new_user?request=failure&type=database')
          } else {
            // make a log
            Log.log('Created', req.user._id, 'New User Created', 'User', 'post new_user database_error', null, user._id)
            res.redirect('/edit_users?request=success&type=created')
          }
        })
      }
    })
  }
})

router.get('/edit_user', function(req, res) {
  var messages = {
    'missing_fields': 'One or more fields are missing. Please complete the form before submitting.'
  }
  var request = req.query.request
  var alert_msg = null
  if (request) {
    alert_msg = messages[req.query.type]
  }
  User.findById(req.query.user, function(err, user) {
    if (err) {
      console.log('edit_user user_lookup database_error')
      res.redirect('/edit_users', 'request=failure&type=database')
    } else {
      if (!user) {
        res.redirect('/edit_users?request=failure&type=not_found')
      } else {
        res.render('edit_views/user/edit_user', {'user': req.user, 'profile': user, 'request': request, 'alert_msg': alert_msg})
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

  if (!email || !password) {
    return res.redirect('/edit_user?user=' + req.query.user + '&request=failure&type=missing_fields')
  }

  User.findByIdAndUpdate(req.query.user, {
    'email': email,
    'password': password,
    'approver': approver
  }, function(err, user) {
    if (err) {
      console.log('edit_user post_edit database_error')
      res.redirect('/edit_users?request=failure&type=database')
    } else {
      // make a log
      var title = ''
      if (email !== user.email) {
        title += 'Email_Changed '
      }
      if (password !== user.password) {
        title += 'Password_Changed '
      }
      if (approver !== user.approver) {
        if (approver) {
          title += 'Promoted '
        } else {
          title += 'Demoted '
        }
      }

      title = title.trim().split(' ').join(', ')

      if (title === '') {
        // nothing was edited, so don't make a log
        res.redirect('/edit_users?request=success&type=updated')
      } else {
        Log.log('Edited', req.user._id, title, 'User', 'post edit_user database_error', null, user._id)
        res.redirect('/edit_users?request=success&type=updated')
      }
    }
  })
})

router.put('/deactivate_user', function(req, res) {
  var username = req.body.username
  console.log(username)

  User.findOneAndUpdate({ 'username': username }, { $set: {
    'active': false
  }}, function(err, user) {
    if (err) {
      res.status(500).send('database error when deactivating user')
    }
    if (user) {
      // make a log
      Log.log('Deactivated', req.user._id, 'User Deactivated', 'User', 'put deactivate_user database_error', null, user._id)

      res.status(200).send('user deactivated')
    } else {
      res.status(500).send('database error when deactivating user')
    }
  })
})

router.put('/activate_user', function(req, res) {
  var id = req.body.id
  User.findByIdAndUpdate(id, { $set: {
    'active': true
  }}, function(err, user) {
    if (err) {
      res.status(500).send('datbase error when activating user')
    }
    // make a log
    Log.log('Activated', req.user._id, 'User Activated', 'User', 'put activate_user database_error', null, user._id)

    res.status(200).send('user activated')
  })
})

module.exports = router
