//REQUIRE IN EXPRESS AND EXPRESS ROUTER TO CREATE ROUTES TO REQUIRE IN APP.JS
var express = require('express')
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
      res.render('home', {'request': req.query.request})
    },
    (err) => {
      res.status(500).send('Database Error: "/"')
    }
  )
});

router.get('/new_request', function(req, res) {
  Group.find({}).then(
    (groups) => {
      res.render('new_request', {"groups": groups.map(x => x.name)})
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
    var new_log = new Log({
      request_id: request._id,
      type: 'NEW_BROADCAST'
    })

    new_log.save(function(err, log) {
      if (err) {
        console.log('new_request update_log database_error')
        res.redirect('/pending_requests?request=failed')
      }
    })
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
        requests = requests.filter(x => x.from._id.toString() === req.user._id.toString())
        pendingRequests = requests.filter(x => x.pending)
        res.render('pending_requests', {
          'pendingRequests': pendingRequests,
          'success': success,
          'failed': failed,
          'approver': req.user.approver
        })
      }
    })
})

router.get('/log', function(req, res) {
  Log.find({})
    .populate({
      path: 'request_id',
      model: Request,
      populate: {
          path: 'from',
          model: User
      }
    })
    .exec(function(err, logs) {
      if (err) {
        console.log("log error_fetching_logs database_error")
        res.redirect('/?request=failure')
      } else {
        console.log(logs)
        res.render('log', {'logs': logs})
      }
    })
})

router.put('/accept_pending_request', function(req, res) {
  // edit the request
  Request.findByIdAndUpdate(req.body.id, {$set: {
    pending: false,
    approved: true,
    approver: req.user.username
  }}, function(err, request) {
    if (err) {
      console.log("accept_pending_request put_approver_info_on_request database_error")
      res.redirect('/?request=failed')
    } else {
      //TODO:// update pending Requests:::: remove from pending requests
    //
    //   var pendingRequests =
    //   User.findOneAndUpdate({'email': request.from}), {$set: {
    //     pendingRequests: pendingRequests
    //   }}, function(err, user) {
    //     if (err) {
    //       console.log('accept_pending_request remove_from_pending_requests database_error')
    //       res.redirect('/?request=failed')
    //     }
    //   }
    // }
  }})
  // make a log
})

router.put('/reject_pending_request', function(req, res) {

})

module.exports = router
