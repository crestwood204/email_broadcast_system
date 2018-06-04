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
  var messages = {
    'database': 'The database failed to respond to this request. Please try again or contact IT for support.',
    'not_found': 'Template could not be found in the database! Please try again or create a new template.',
    'deleted': 'Template deleted successfully!',
    'updated': 'Template updated succesfully!',
    'created': 'Template created successfully!'
  }
  var request = req.query.request
  var alert_msg = null
  if (request) {
    alert_msg = messages[req.query.type]
  }
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
        res.redirect('/edit_users?update=true')
      } else {
        Log.log('Edited', req.user._id, title, 'User', 'post edit_user database_error', null, user._id)
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
  var messages = {
    'database': 'The database failed to respond to this request. Please try again or contact IT for support.',
    'not_found': 'Template could not be found in the database! Please try again or create a new template.',
    'deleted': 'Template deleted successfully!',
    'updated': 'Template updated succesfully!',
    'created': 'Template created successfully!'
  }
  var request = req.query.request
  var alert_msg = null
  if (request) {
    alert_msg = messages[req.query.type]
  }
  Template.find({})
    .populate({
      path: 'createdBy',
      model: 'User'
    })
    .exec(function(err, templates) {
      if (err) {
        console.log("pending_requests error_fetching requests database_error")
        res.send('Error Fetching Templates From the Database!! Refresh the Page or Contact IT for help.')
      } else {
        res.render('edit_views/template/edit_templates', {'user': req.user, 'request': request, 'alert_msg': alert_msg, 'templates': templates})
      }
    })
})

router.get('/new_template', function(req, res) {
  var messages = {
    'missing_fields': 'One or more fields are missing. Please complete the form before submitting'
  }
  var request = req.query.request
  var alert_msg = null
  if (request) {
    alert_msg = messages[req.query.type]
  }
  res.render('edit_views/template/new_template', {'user': req.user, 'request': request, 'alert_msg': alert_msg})
})

router.post('/new_template', function(req, res) {
  var title = req.body.title
  var subject = req.body.subject
  var body = req.body.body
  var createdBy = req.user._id
  if (!title || !subject || !body) {
    res.redirect('/new_template?request=failure&type=missing_fields&title=' + title + '&subject=' + subject + '&body=' + body)
    return
  }
  var new_template = new Template({
    'title': title,
    'subject': subject,
    'body': body,
    'createdBy': createdBy
  })

  new_template.save(function(err, template) {
    if (err) {
      console.log('new_template save datbase_error')
      res.redirect('/edit_templates?request=failure&type=database')
    } else {
      // make a log
      Log.log('Created', req.user._id, 'New Template Created', 'Template', 'post new_template database_error', null, null, template._id, null, title)
      res.redirect('/edit_templates?request=success&type=created')
    }
  })
})

router.get('/edit_template', function(req, res) {
  var messages = {
    'missing_fields': 'One or more fields are missing. Please complete the form before submitting',
  }
  var request = req.query.request
  var alert_msg = null
  if (request) {
    alert_msg = messages[req.query.type]
  }
  var template_id = req.query.template
  Template.findById(template_id, function(err, template) {
    if (err) {
      console.log('edit_template template_lookup database_error')
      res.redirect('/edit_templates', 'request=failure&type=database')
    } else {
      if (!template) {
        res.redirect('/edit_templates?request=failure&type=not_found')
      } else {
        res.render('edit_views/template/edit_template', {'user': req.user, 'template': template, 'request': request, 'alert_msg': alert_msg})
      }
    }
  })
})

router.post('/edit_template', function(req, res) {
  var title = req.body.title
  var subject = req.body.subject
  var body = req.body.body
  var id = req.query.template

  if (!title || ! subject || !body) {
    return res.redirect('/edit_template?template=' + id + '&request=failure&type=missing_fields')
  }

  Template.findByIdAndUpdate(id, {
    'title': title,
    'subject': subject,
    'body': body
  }, function(err, template) {
    if (err) {
      console.log('edit_template post_edit database_error')
      res.redirect('/edit_templates?request=failed')
    } else {
      // make a log
      var log_title = ''
      if (title !== template.title) {
        log_title += 'Title_Changed '
      }
      if (subject !== template.subject) {
        log_title += 'Subject_Changed '
      }
      if (body !== template.body) {
        log_title += 'Body_Changed '
      }

      log_title = log_title.trim().split(' ').join(', ')

      if (log_title === '') {
        // nothing was edited, so don't make a log
        res.redirect('/edit_templates?request=success&type=updated')
      } else {
        Log.log('Edited', req.user._id, log_title, 'Template', 'post edit_template database_error', null, null, template._id, null, title)
        res.redirect('/edit_templates?request=success&type=updated')
      }
    }
  })
})

router.put('/delete_template', function(req, res) {
  var id = req.body.template_id
  var template_title = req.body.template_title
  Template.deleteOne({'_id': id}, function(err) {
    if (err) {
      console.log('put delete_template database_error')
    } else {
      // make a log
      Log.log('Deleted', req.user._id, 'Template Deleted', 'Template', 'put delete_template database_error', null, null, null, null, template_title)
      res.send('Template Deleted Successfully')
    }
  })
})
module.exports = router
