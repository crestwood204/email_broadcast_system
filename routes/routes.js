//REQUIRE IN EXPRESS AND EXPRESS ROUTER TO CREATE ROUTES TO REQUIRE IN APP.JS
var express = require('express')
var nodemailer = require('nodemailer')
var datejs = require('datejs')
var router = express.Router()

//REQUIRE IN MODELS
var Models = require('../models/models')
var User = Models.User
var Request = Models.Request
var Log = Models.Log
var Group = Models.Group
var Template = Models.Template

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
  Group.find({}).then(
    (groups) => {
      Template.find({}).then(
        (templates) => {
          templates = templates.sort(function(a, b) {
            return a.name - b.name
          })
          res.render('new_request', {"groups": groups.map(x => x.name), 'templates': templates, 'user': req.user})
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
  var to = req.body.toField
  var subject = req.body.subject
  var body = req.body.body
  var from = req.user._id

  // convert toField into an array if it is a string
  if (typeof to !== 'object') {
    to = [to]
  }

  // save request object
  var new_request = new Request({
    to: to,
    from: from,
    subject: subject,
    body: body
  })
  new_request.save(function(err, request) {
    if (err) {
      console.log('new_request save database_error')
      res.redirect('/pending_requests?request=failed')
    }

    // add to log
    Log.log('Create', req.user._id, 'Broadcast Request Created', 'Broadcast', 'post new_request database_error', request._id)

    // send emails to approvers
    User.find({}).then(
      (users) => {
        var approver_emails = users.filter(x => x.approver === true).
          map(x => x.email)
          //send approver_emails
        sendEmail(approver_emails, request.subject, request.body, [request.to, req.user.email])
      },
      (err) => {
        console.log('new_request error_sending_emails database_error')
      }
    )
  })
  //redirect
  res.redirect('/pending_requests?request=success')
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
            x.date_string = x.date.format("d/m/Y").split('/0').join('/')
            x.time_string = x.date.format("h:m")
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
  var change = 'Rejected'
  if (approved) {
    change = 'Approved'
  }

  Request.findById(req.body.id, function(err, request) {
    if (err) {
      console.log("decide_request update database_error")
      res.redirect('/?request=failed')
    }
    if (request.pending) {
      Request.update({_id: req.body.id}, {$set: {
        pending: false,
        approved: approved,
        approver: req.user.username
      }}, function(err) {
        if (err) {
          console.log("decide_request update database_error")
          res.redirect('/?request=failed')
        } else {
          // broadcast email
          if (approved) {
              sendEmail(request.to, request.subject, request.body)
          }
          // make log
          Log.log(change, req.user._id, 'Broadcast Request ' + change, 'Broadcast', 'post decide_request database_error', request._id)
        }
      })
    }
  })
})

var sendEmail = function(bcc, subject, text, email_inputs) {

  // create html
  var html = ''
  if (email_inputs) {
    html = `<html>
      <head>
        <style>

        </style>
      </head>
      <body>
        <div> Requester: ${email_inputs[1]} </div>
        <div> Broadcast To: ${email_inputs[0]} </div>
        <div class="divider-top"> Subject: ${subject} </div>
        <div class="divider-top"> ${text} </div>
        <button class="approve-btn">Approve</button>
        <button class="reject-btn">Reject</reject>
      </body>
    </html>`
    email()
  } else {
    html = `<html>
      <div> ${text} </div>
    </html>`

    Group.find({}).then(
      (groups) => {
        groups = groups.filter(x => bcc.includes(x.name))
        groups = groups.map(x => x.email)
        email()
      },
      (err) => {
        console.log('sendEmail error_fetching_groups database_error')
      }
    )
  }

  // send emails

  var email = function() {
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        host: process.env.HOST_IP,
        port: 25,
        tls: {
          rejectUnauthorized: false
        }
    });

    // setup email data with unicode symbols
    let mailOptions = {
        from: process.env.BROADCAST_ADDRESS, // sender address
        to: '', // list of receivers
        bcc: groups,
        subject: subject, // Subject line
        text: text, // plain text body
        html: html // html body
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log('err', error);
        }
        console.log(info)
    });
  }
}

module.exports = router
