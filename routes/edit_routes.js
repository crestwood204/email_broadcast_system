var express = require('express')
var router = express.Router()

//REQUIRE IN MODELS
var Models = require('../models/models')
var User = Models.User
var Request = Models.Request
var Log = Models.Log
var Group = Models.Group
var Template = Models.Template

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
        res.render('edit_views/user/edit_users', { 'users': users, 'success': success, 'failed': failed, 'update': update, 'deactivate': deactivate, 'user': req.user })
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
  res.render('edit_views/user/new_user', {'user': req.user, 'msg': msg})
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
            // make a log
            Log.log('Created', req.user._id, 'New User Created', 'User', 'post new_user database_error', null, user._id)
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
          res.render('edit_views/user/edit_user', {'user': req.user, 'profile': user})
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

  User.findOneAndUpdate({ 'username': username }, {
    'email': email,
    'password': password,
    'approver': approver
  }, function(err, user) {
    if (err) {
      console.log('edit_user post_edit database_error')
      res.redirect('/edit_users?request=failed')
    } else {
      // make a log
      var title = ''
      if (email !== user.email) {
        title += 'Email Changed '
      }
      if (password !== user.password) {
        title += 'Password Changed '
      }
      if (approver !== user.approver) {
        if (approver) {
          title += 'Promoted '
        } else {
          title += 'Demoted '
        }
      }

      title.trim().split(' ').join(', ')

      if (!title) {
        // nothing was edited, so don't make a log
        res.redirect('/edit_users?update=true')
      } else {
        Log.log('Edited', req.user._id, 'User ' + title, 'User', 'post edit_user database_error', null, user._id)
        res.redirect('/edit_users?update=true')
      }

    }
  })
})

router.put('/deactivate_user', function(req, res) {
  var username = req.body.username

  User.findOneAndUpdate({ 'username': username }, { $set: {
    'active': false
  }}, function(err, user) {
    if (err) {
      res.status(500).send('database error when deactiving user')
    }
    // make a log
    Log.log('Deactivated', req.user._id, 'User Deactivated', 'User', 'put deactivate_user database_error', null, user._id)

    res.status(200).send('user deactivated')
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

router.get('/edit_groups', function(req, res) {
  res.render('edit_views/group/edit_groups', {'user': req.user})
})

router.get('/edit_templates', function(req, res) {
  // [queries request=failed for db fail query, request=no_template for template not found, request=delete for delete template successful]
  Template.find({})
    .populate({
      path: 'createdBy',
      model: 'User'
    })
    .exec(function(err, templates) {
      if (err) {
        console.log("pending_requests error_fetching requests database_error")
        // TODO: handle this error, coppied from routes.js....
      } else {
          res.render('edit_views/template/edit_templates', {'user': req.user, 'templates': templates})
      }
    })
})

router.get('/new_template', function(req, res) {
  res.render('edit_views/template/new_template', {'user': req.user})
})

router.post('/new_template', function(req, res) {
  // queries : request=database_error, request=success
  var title = req.body.title
  var subject = req.body.subject
  var body = req.body.body
  var createdBy = req.user._id

  var new_template = new Template({
    'title': title,
    'subject': subject,
    'body': body,
    'createdBy': createdBy
  })

  new_template.save(function(err, template) {
    if (err) {
      console.log('new_template save datbase_error')
      res.redirect('/new_template?request=database_error')
    } else {
      // make a log
      Log.log('Created', req.user._id, 'New Template Created', 'Template', 'post new_template database_error', null, req.user._id)
      res.redirect('/edit_templates?request=success')
    }
  })
})

router.get('/edit_template', function(req, res) {
  var template_id = req.query.template
  Template.findById(template_id, function(err, template) {
    if (err) {
      console.log('edit_template template_lookup database_error')
      res.redirect('/edit_templates', 'request=failed')
    } else {
      if (!template) {
        res.redirect('/edit_templates?request=no_template')
      } else {
        res.render('edit_views/template/edit_template', {'user': req.user, 'template': template})
      }
    }
  })
})

router.post('/edit_template', function(req, res) {
  var title = req.body.title
  var subject = req.body.subject
  var body = req.body.body
  var editedBy = req.user.username
  if (req.body.approver) {
    approver = true
  }

  User.findOneAndUpdate({ 'username': username }, {
    'email': email,
    'password': password,
    'approver': approver
  }, function(err, user) {
    if (err) {
      console.log('edit_user post_edit database_error')
      res.redirect('/edit_users?request=failed')
    } else {
      // make a log
      var title = ''
      if (email !== user.email) {
        title += 'Email Changed '
      }
      if (password !== user.password) {
        title += 'Password Changed '
      }
      if (approver !== user.approver) {
        if (approver) {
          title += 'Promoted '
        } else {
          title += 'Demoted '
        }
      }

      title.trim().split(' ').join(', ')

      if (!title) {
        // nothing was edited, so don't make a log
        res.redirect('/edit_users?update=true')
      } else {
        Log.log('Edited', req.user._id, 'User ' + title, 'User', 'post edit_user database_error', null, user._id)
        res.redirect('/edit_users?update=true')
      }

    }
  })
})

module.exports = router
