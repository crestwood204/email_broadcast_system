var express = require('express')
var router = express.Router()

//REQUIRE IN MODELS
var Models = require('../../models/models')
var User = Models.User
var Request = Models.Request
var Log = Models.Log
var Group = Models.Group
var Template = Models.Template

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
