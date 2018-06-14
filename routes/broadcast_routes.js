// create routes for app.js
const express = require('express');

// import modules
const datejs = require('datejs');
const path = require('path');
const multer = require('multer'); // npm package for file uploads

const upload = multer();
const router = express.Router();

const Models = require('../models/models');
const Helpers = require('../helpers/helpers');

const sendApproverEmail = Helpers.SendApproverEmail;
const [User, Request, Log, Group, Template] =
  [Models.User, Models.Request, Models.Log, Models.Group, Models.Template];

// configure settings for file upload
const uploadStorage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, './uploads');
  },
  filename(req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}-${file.originalname}`);
  }
});

/**
 * Redirects to login if not signed in.
 * After signing in, redirects to the page the user attempted to access
 */
router.use((req, res, next) => {
  if (!req.user) {
    const index = req.url.indexOf('?');
    if (index !== -1) {
      req.session.returnTo = req.path + req.url.substr(index);
    } else {
      req.session.returnTo = req.path;
    }
    return res.redirect('/login');
  }
  return next();
});

/**
 * Loads the home page
 * Displays Broadcasts that have been sent out
 */
router.get('/', function(req, res) {
  Request.find({})
    .populate({
      path: 'from',
      model: 'User'
    })
    .exec(function(err, requests) {
      if (err) {
        res.status(500).send('Database Error: "/"')
      }
      broadcasts = requests.filter(x => x.approved === true)
      res.render('home', {'broadcasts': broadcasts, 'user': req.user})
    })
});

/**
 * Loads new_request page
 */
router.get('/new_request', function(req, res) {
  var messages = {
    'file_extension': 'One or more files you have attached are unsupported. Only .docx and .pdf files are allowed',
    'limit_file_size': 'One of more files you have attached is larger than the max file size - 250 KB',
    'missing_fields': 'One or more required fields are not filled out'
  }
  var to = req.query.to
  var subject = req.query.subject
  var body = req.query.body
  var request = req.query.request
  var alert_msg = null
  if (request) {
    alert_msg = messages[req.query.type]
  }
  Group.find({}).then(
    (groups) => {
      Template.find({}).then(
        (templates) => {
          templates = templates.sort(function(a, b) {
            return a.name - b.name
          })
          res.render('new_request', {"groups": groups.map(x => x.name), 'templates': templates, 'request': request, 'alert_msg': alert_msg, 'to': to, 'subject': subject, 'body': body, 'user': req.user})
        },
        (err) => {
            res.status(500).send('Database Error: "/new_request templates"')
        }
      )
    },
    (err) => {
      res.status(500).send('Database Error: "/new_request groups"')
    }
  )
})

/**
 * Handles new_requests
 * Defines file restrictions
 */
router.post('/new_request', function(req, res) {
  var maxSize = 250 * 1024 // 250 KB

  var upload = multer({
    storage: uploadStorage,
    limits: { fileSize: maxSize },
    fileFilter: function(req, file, callback) {
      if (file.mimetype !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          && file.mimetype !== 'application/pdf') {
        var query = 'to=' + req.body.toField + '&subject=' + req.body.subject + '&body=' + req.body.body
        req.fileValidationError = '/new_request?request=failure&type=file_extension&' + query
        return callback(new Error('extension name not allowed'))
			}
      callback(null, true)
    }
  }).array('files', 7) // TODO: change this because want to add a bunch of single file attachments rather than a bunch of attachments from one button
  upload(req, res, function(err) {
    if (req.fileValidationError) {
      return res.redirect(req.fileValidationError)
    }

    // TODO: add locationField support
    var to = req.body.toField
    var subject = req.body.subject
    var body = req.body.body
    var from = req.user._id
    var query = 'to=' + to + '&subject=' + subject + '&body=' + body

    if (err) {
      //TODO: format error message if it isn't a validation error
      console.log(err.code)
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.redirect('/new_request?request=failure&type=limit_file_size&' + query)
      }
      return res.status(400).send(err)
    }

    if (!to || !subject || !body) {
      return res.redirect('/new_request?request=failure&type=missing_fields&' + query)
    }

    // convert toField into an array if it is a string
    if (typeof to !== 'object') {
      to = [to]
    }

    // save request object
    var new_request = new Request({
      to: to,
      from: from,
      subject: subject,
      body: body,
      attachments: req.files
    })
    new_request.save(function(err, request) {
      if (err) {
        console.log('new_request save database_error')
        return res.redirect('/pending_requests?request=failure&type=database')
      }

      // add to log
      Log.log('Create', req.user._id, 'Broadcast Request Created', 'Broadcast', 'post new_request database_error', request._id)

      // send emails to approvers
      User.find({}).then(
        (users) => {
          var approvers = users.filter(x => (x.approver && x.active)).
            map(x => {
              var rObj = {
                'email': x.email,
                'id': x._id
              }
              return rObj
            })

          sendApproverEmail(approvers, request, req.user.email)
          res.redirect('/pending_requests?request=success')
        },
        (err) => {
          console.log('new_request error_sending_emails database_error')
          return res.redirect('/pending_requests?request=failure&type=database')
        }
      )
    })
  })
})

/**
 * Provides a route for the user to load templates from
 */
router.get('/get_templates', function(req,res) {
  Template.find({}).then(
    (templates) => {
        res.status(200).send(JSON.stringify(templates))
    },
    (err) => {
      console.log('get_templates fetch_templates database_error')
      res.status(500).send('Database Error While Retrieving Template')
    })
})

/**
 *
 */
router.get('/pending_requests', function(req, res) {
  success = false
  failed = false
  if (req.query.request === 'success') {
    success = true
  }
  if (req.query.request === 'failed') {
    failed = true
  }
  Request.find({})
    .populate({
      path: 'from',
      model: 'User'
    })
    .exec(function(err, requests) {
      if (err) {
        console.log("pending_requests error_fetching requests database_error")
      } else {
        if (!req.user.approver) {
            requests = requests.filter(x => x.from._id.toString() === req.user._id.toString())
        }
        pendingRequests = requests.filter(x => x.pending)
        res.render('pending_requests', {
          'pendingRequests': pendingRequests.reverse(),
          'success': success,
          'failed': failed,
          'user': req.user
        })
      }
    })
})
module.exports = router
