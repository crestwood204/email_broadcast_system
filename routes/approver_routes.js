var express = require('express')
var router = express.Router()
var nodemailer = require('nodemailer')

//REQUIRE IN MODELS
var Models = require('../models/models')
var User = Models.User
var Request = Models.Request
var Log = Models.Log
var Group = Models.Group
var Template = Models.Template

// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
    host: process.env.HOST_IP,
    port: 25,
    tls: {
      rejectUnauthorized: false
    }
});

// route that rejects all non-approvers
router.use(function(req, res, next) {
  console.log('hit a wall')
  if (req.user.approver) {
    return next();
  } else {
    res.render('error_views/unauthorized')
  }
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
      decideRequest(request_id, user, approved, transporter, req, res)
    }
  })
})


module.exports = router
