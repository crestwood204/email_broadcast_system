var nodemailer = require('nodemailer')
var Models = require('./models/models')
var User = Models.User
var Group = Models.Group
var Request = Models.Request

var sendEmail = function(transporter, bcc, subject, text, email_inputs, request_id) {
  var mailOptions = {}
  // create html
  var html = ''

  // send email to approvers
  if (email_inputs) {
    // setup email data with unicode symbols

    bcc.forEach(function(user) {
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
            <a href="/10.10.1.79:3000/decide_request_email?user_id=${user.id}&request_id=${request_id}&decision=${reject}">
              <button name="decision" value="reject">Reject</button>
            </a>
            <a href="/10.10.1.79:3000/decide_request_email?user_id=${user.id}&request_id=${request_id}&decision=${approve}">
              <button name="decision" value="approve">Approve</button>
            </a>
        </body>
      </html>`

      mailOptions = {
          from: process.env.BROADCAST_ADDRESS, // sender address
          to: '', // list of receivers
          bcc: user.email,
          subject: 'BROADCAST REQUEST', // Subject line
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
    })
  } else {
    html = `<html>
      <div> ${text} </div>
    </html>`

    Group.find({}).then(
      (groups) => {
        groups = groups.filter(x => bcc.includes(x.name))
        groups = groups.map(x => x.email)
        mailOptions = {
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
      },
      (err) => {
        console.log('sendEmail error_fetching_groups database_error')
      }
    )
  }
}


var decideRequest = function(request_id, user, approved, transporter) {
  var change = 'Rejected'
  if (approved) {
    change = 'Approved'
  }

  Request.findById(request_id, function(err, request) {
    if (err) {
      console.log("decide_request update database_error")
      res.redirect('/?request=failed')
    }
    if (request.pending) {
      Request.update({_id: request_id}, {$set: {
        pending: false,
        approved: approved,
        approver: user.username
      }}, function(err) {
        if (err) {
          console.log("decide_request update database_error")
          res.redirect('/?request=failed')
        } else {
          // broadcast email
          if (approved) {
              sendEmail(transporter, request.to, request.subject, request.body)
          }
          // make log
          Log.log(change, user._id, 'Broadcast Request ' + change, 'Broadcast', 'post decide_request database_error', request._id)
        }
      })
    }
  })
}
module.exports = {
  SendEmail: sendEmail,
  DecideRequest: decideRequest
}
