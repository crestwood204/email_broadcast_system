//REQUIRE IN EXPRESS AND EXPRESS ROUTER TO CREATE ROUTES TO REQUIRE IN APP.JS
var express = require('express')
var nodemailer = require('nodemailer')
var router = express.Router()

//REQUIRE IN MODELS
var Models = require('../models/models')
var User = Models.User
var Request = Models.Request
var Log = Models.Log
var Group = Models.Group

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
      res.render('new_request', {"groups": groups.map(x => x.name), 'user': req.user})
    },
    (err) => {
      res.status(500).send('Database Error: "/new_request"')
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
        //send emails
        //TODO: send emails
        console.log(approver_emails)
      },
      (err) => {
        console.log('new_request error_sending_emails database_error')
      }
    )
  })
  //redirect
  res.redirect('/pending_requests?request=success')
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
    }])
    .exec(function(err, logs) {
      if (err) {
        console.log("log error_fetching_logs database_error")
        res.redirect('/?request=failure')
      } else {
        logs.map(
          (x) => {
            var date_str = x.date.toLocaleString().split(', ')
            x.date_string = date_str[0]
            x.time_string = date_str[1]
          }
        )
        res.render('log', {'logs': logs.reverse(), 'user': req.user})
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
    if (request.pending) {
      Request.update({_id: req.body.id}, {$set: {
        pending: false,
        approved: approved,
        approver: req.user.username
      }}, function(err, updated_request) {
        if (err) {
          console.log("decide_request update database_error")
          res.redirect('/?request=failed')
        } else {
          // TODO:?? sendEmail(request.to, request.subject, request.body)
          // make log
          Log.log(change, req.user._id, 'Broadcast Request ' + change, 'Broadcast', 'post decide_request database_error', updated_request._id)
        }
      })
    }
  })
})

var sendEmail = function(to, subject, text) {
  // change to from an array to a string
  to = to.join(', ')
  // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASS
        }
    });

    // setup email data with unicode symbols
    let mailOptions = {
        from: '"Fred Foo 👻" <foo@example.com>', // sender address
        to: 'bar@example.com, baz@example.com', // list of receivers
        subject: 'Hello ✔', // Subject line
        text: 'Hello world?', // plain text body
        html: '<b>Hello world?</b>' // html body
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message sent: %s', info.messageId);
        // Preview only available when sending through an Ethereal account
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

        // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
        // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
    });
}

module.exports = router
