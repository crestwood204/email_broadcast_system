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

router.get('/edit_groups', function(req, res) {
  var messages = {
    'database': 'The database failed to respond to this request. Please try again or contact IT for support.',
    'created': 'Group created successfully!',
    'updated': 'Group updated succesfully!',
    'fail_find': 'The database failed to find this group. Please try again or contact IT for support.',
    'deleted': 'Group deleted successfully!'
  }
  var request = req.query.request
  var alert_msg = null
  if (request) {
    alert_msg = messages[req.query.type]
  }
  Group.find({}).then(
    (groups) => {
      res.render('edit_views/group/edit_groups', {'user': req.user, 'request': request, 'alert_msg': alert_msg, 'groups': groups})
    },
    (err) => {
      res.render('edit_views/group/edit_groups', {'user': req.user, 'request': 'failure', 'alert_msg': 'Error Fetching Groups From the Database!! Refresh the Page or Contact IT for help.'})
    }
  )

})

router.get('/new_group', function(req, res) {
  var messages = {
    'emailFormat': 'Email Format is Incorrect.',
    'missing_fields': 'One or more fields are missing. Please complete the form before submitting.',
    'dupKey': 'There is already a group with this name. Please choose a different name.',
  }
  var msg = undefined
  if (req.query.msg) {
    msg = messages[req.query.msg]
  }
  var name = req.query.name
  var email = req.query.email

  res.render('edit_views/group/new_group', {'user': req.user, 'msg': msg, 'name': name, 'email': email})
})

router.post('/new_group', function(req, res) {
  var name = req.body.name
  var email = req.body.email

  function validateEmail(email) {
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
  }

  if (!name || ! email) {
    return res.redirect('/new_group?msg=missing_fields&name=' + name + '&email=' + email)
  }

  // validate email
  if (!validateEmail(email)) {
    return res.redirect('/new_group?msg=emailFormat&name=' + name + '&email=' + email)
  }

  var new_group = new Group({
    'name': name,
    'email': email
  })

  new_group.save(function(err, group) {
    if (err) {
      if (err.code === 11000) {
        return res.redirect('/new_group?msg=dupKey&name=' + name + '&email=' + email)
      } else {
        console.log('new_group create database_error', err)
        return res.redirect('/edit_groups?request=failure&type=database')
      }
    } else {
      // make a log;
      Log.log('Created', req.user._id, 'New Group Created', 'Group', 'post new_group database_error', null, null, null, group._id, name)
      res.redirect('/edit_groups?request=success&type=created')
    }
  })
})

router.get('/edit_group', function(req, res) {
  var messages = {
    'dupKey': 'There is already another group with this name. Please choose another name and try again.'
  }
  var id = req.query.group
  if (req.query.msg) {
    msg = messages[req.query.msg]
    return res.render('edit_views/group/edit_group', { user: req.user, 'name': req.query.name, 'email': req.query.email, 'msg': msg })
  }
  Group.findById(id).then(
    (group) => {
      res.render('edit_views/group/edit_group', { user: req.user, 'name': group.name, 'email': group.email })
    },
    (err) => {
      console.log('get edit_group database_error')
      res.redirect('/edit_groups?request=failure&type=fail_find')
    }
  )
})

router.post('/edit_group', function(req, res) {
  var name = req.body.name
  var email = req.body.email
  var id = req.query.group

  function validateEmail(email) {
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
  }

  if (!name || ! email) {
    return res.redirect('/new_group?group=' + id + '&msg=missing_fields&name=' + name + '&email=' + email)
  }

  // validate email
  if (!validateEmail(email)) {
    return res.redirect('/new_group?group=' + id + '&msg=emailFormat&name=' + name + '&email=' + email)
  }

  // make sure no duplicate template name
  Group.findByIdAndUpdate(id, { $set: { 'name': name, 'email': email }}, function(err, group) {
    if (err) {
      if (err.codeName === 'DuplicateKey') {
        return res.redirect('/edit_group?group=' + id + '&msg=dupKey&name=' + name + '&email=' + email)
      } else {
        console.log('edit_group update database_error', err.errmsg)
        return res.redirect('/edit_groups?request=failure&type=database')
      }
    } else {
      // make a log
      Log.log('Edited', req.user._id, 'Group Edited', 'Group', 'post edit_group database_error', null, null, null, group._id, name)
      res.redirect('/edit_groups?request=success&type=updated')
    }
  })
})

router.put('/delete_group', function(req, res) {
  var group_name = req.body.group_name
  Group.deleteOne({'_id': req.body.id}, function(err) {
    if (err) {
      res.status(500).send('Database Error, could not delete document.')
    } else {
      // make a log
      Log.log('Deleted', req.user._id, 'Group Deleted', 'Group', 'put delete_group database_error', null, null, null, null, group_name)

      res.status(200).send('Document deleted')
    }
  })
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
    'missing_fields': 'One or more fields are missing. Please complete the form before submitting.'
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
