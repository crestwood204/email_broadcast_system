var express = require('express')
var router = express.Router()

//REQUIRE IN MODELS
var Models = require('../../models/models')
var User = Models.User
var Request = Models.Request
var Log = Models.Log
var Group = Models.Group
var Template = Models.Template

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

module.exports = router
