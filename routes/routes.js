//REQUIRE IN EXPRESS AND EXPRESS ROUTER TO CREATE ROUTES TO REQUIRE IN APP.JS
var express = require('express')
var nodemailer = require('nodemailer')
var datejs = require('datejs')
var path = require('path')
var multer = require('multer')
var upload = multer()
var router = express.Router()

//REQUIRE IN MODELS
var Models = require('../models/models')
var User = Models.User
var Request = Models.Request
var Log = Models.Log
var Group = Models.Group
var Template = Models.Template

//REQUIRE IN HELPERS
var Helpers = require('../helpers')
var sendApproverEmail = Helpers.SendApproverEmail
var decideRequest = Helpers.DecideRequest

// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
    host: process.env.HOST_IP,
    port: 25,
    tls: {
      rejectUnauthorized: false
    }
});

var upload_storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads')
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + '-' + file.originalname)
  }
})

// redirect to login if not signed in
router.use(function(req, res, next) {
  if (!req.user) {
    res.redirect('/login');
  } else {
    return next();
  }
});

// load screen
router.get('/', function(req, res) {
  User.findById(req.user._id).then(
    (user) => {
      res.render('home', {'request': req.query.request, 'user': req.user})
    },
    (err) => {
      res.status(500).send('Database Error: "/"')
    }
  )
});

router.get('/new_request', function(req, res) {
  var messages = {
    'file_extension': 'One or more files you have attached are unsupported. Only .docx and .pdf files are allowed',
    'limit_file_size': 'One of more files you have attached is larger than the max file size - 250 KB',
    'missing_fields': 'One or more required fields are not filled out'
  }
  var to, subject, body
  var request = req.query.request
  var alert_msg = null
  if (request) {
    alert_msg = messages[req.query.type]
    to = req.query.to
    subject = req.query.subject
    body = req.query.body
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

router.post('/new_request', function(req, res) {
  var maxSize = 250 * 1024 // 250 KB
  var upload = multer({
    storage: upload_storage,
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
    var to = req.body.toField
    var subject = req.body.subject
    var body = req.body.body
    var from = req.user._id
    var query = 'to=' + to + '&subject=' + subject + '&body=' + body

    if (err) {
      //TODO: fromat error message if it isn't a validation error
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
            //send approver_emails

          sendApproverEmail(transporter, approvers, request, req.user.email)

          // redirect
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

router.get('/log', function(req, res) {
  Log.find({})
    .populate([{
      path: 'request_id',
      model: Request,
      populate: {
          path: 'from',
          model: User
      }
    }, {
      path: 'user_id',
      model: 'User'
    }, {
      path: 'edit_user_id',
      model: 'User'
    }, {
      path: 'template_id',
      model: 'Template'
    }, {
      path: 'group_id',
      model: 'Group'
    }])
    .exec(function(err, logs) {
      if (err) {
        console.log("log error_fetching_logs database_error")
        res.redirect('/?request=failure')
      } else {
        logs.sort(function(a, b) {
          return b.date - a.date
        })
        var new_logs = logs.map(
          (x) => {
            x.date_string = x.date.format("Y-m-d")
            x.time_string = x.date.format("g:i")
            if (x.time_string.charAt(0) === '0') {
              x.time_string = x.time_string.substring(1)
            }
            var ampm = x.date.getHours() >= 12 ? 'PM' : 'AM'
            x.time_string = x.time_string + ' ' + ampm
            return x
          }
        )
        res.render('log', { 'logs': new_logs, 'user': req.user})
      }
    })
})

router.post('/decide_request', function(req, res) {
  // edit the request
  var approved = req.body.decision === 'approve'
  var request_id = req.body.id
  decideRequest(request_id, req.user, approved, transporter)
})

router.get('/decide_request_email', function(req, res) {
  var user_id = req.query.user_id
  var approved = req.query.decision === 'approve'
  var request_id = req.query.request_id

  User.findById(user_id, function(err, user) {
    if (err) {
      console.log('decide_request mobile_user_lookup database_error')
    } else {
      decideRequest(request_id, user, approved, transporter)
      res.render('close_window')
    }
  })
})
module.exports = router
