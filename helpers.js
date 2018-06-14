var nodemailer = require('nodemailer')
var Models = require('./models/models')
var fs = require('fs')
var User = Models.User
var Group = Models.Group
var Request = Models.Request
var Log = Models.Log

var sendApproverEmail = function(transporter, approvers, request, user_email) {
  var html, mailOptions, files = request.attachments

  if (files) {
     files = files.map(x => {
      var rObj = {
        filename: x.originalname,
        encoding: x.encoding,
        path: x.path
      }
      return rObj
    })
  }

  // send email to approvers
  approvers.forEach(function(user) {
    html = `<html>
      <head>
        <style>

        </style>
      </head>
      <body>
        <div> Requester: ${user_email} </div>
        <div> Broadcast To: ${request.to} </div>
        <div class="divider-top"> Subject: ${request.subject} </div>
        <div class="divider-top"> ${request.body} </div>
          <table cellspacing="0" cellpadding="0">
            <tr>
              <td align="center" bgcolor="#d9534f" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;">
                <a href="http://10.10.1.79:3000/decide_request_email?user_id=${user.id}&request_id=${request._id}&decision=reject" style="font-size:16px; font-weight: bold; font-family: ITC New Baskerville Std Roman, Helvetica, Arial, sans-serif; text-decoration: none; line-height:30px; width:100%; display:inline padding: 1px 5px; font-size: 12px; line-height: 1.5; border-radius: 3px;"><span style="color: #FFFFFF">Reject</span></a>
              </td>
              <td align="center" display="inline-block" width="10px"> </td>
              <td align="center" bgcolor="#449d44" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;">
                <a href="http://10.10.1.79:3000/decide_request_email?user_id=${user.id}&request_id=${request._id}&decision=approve" style="font-size:16px; font-weight: bold; font-family: ITC New Baskerville Std Roman, Helvetica, Arial, sans-serif; text-decoration: none; line-height:30px; width:100%; display:inline; padding: 1px 5px; font-size: 12px; line-height: 1.5; border-radius: 3px;"><span style="color: #FFFFFF">Approve</span></a>
              </td>
            </tr>
          </table>
          <div> Note that you may need to login in order to approve or reject the request - In this case, you must login before you can approve or reject a broadcast request.</div>
      </body>
    </html>`

    mailOptions = {
        from: process.env.BROADCAST_ADDRESS, // sender address
        to: '', // list of receivers
        bcc: user.email,
        subject: 'BROADCAST REQUEST', // Subject line
        text: request.body, // plain text body
        html: html, // html body
        attachments: files // file attachments
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log('err', error);
        }
        console.log('email approval sent to ' + user.email)
    });
  })
}

var sendBroadcastEmail = function(transporter, request) {
  html = `<html>
    <div> ${request.body} </div>
  </html>`

  Group.find({}).then(
    (groups) => {
      groups = groups.filter(x => request.to.includes(x.name))
      groups = groups.map(x => x.email)
      mailOptions = {
          from: process.env.BROADCAST_ADDRESS, // sender address
          to: '', // list of receivers
          bcc: groups,
          subject: request.subject, // Subject line
          text: request.body, // plain text body
          html: html, // html body
          attachments: request.attachments
      };
      // send mail with defined transport object
      transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
              return console.log('err', error);
          }
          console.log('email broadcast sent')

          // delete attachments from server directory
          rmDir('./uploads', request.attachments)
      });
    },
    (err) => {
      console.log('sendEmail error_fetching_groups database_error')
    }
  )
}

var rmDir = function(dirPath, attachments) {
  try {
    var files = fs.readdirSync(dirPath);
  } catch(e) {
    console.log('Error removing uploads from server', e)
  }
  attachments = attachments.map(x => './' + x.path)
  attachments.forEach(filePath => {
    if (fs.statSync(filePath).isFile()) {
      fs.unlinkSync(filePath)
    }
  })
};

var decideRequest = function(request_id, user, approved, transporter, req, res) {
  var change = 'Rejected'
  if (approved) {
    change = 'Approved'
  }

  Request.findById(request_id, function(err, request) {
    if (err) {
      console.log("decide_request update database_error")
      return res.redirect('/?request=failed')
    }
    if (!request) {
      console.log(request_id)
      return res.redirect('/?request=failed')
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
            sendBroadcastEmail(transporter, request)
          } else {
            rmDir('./uploads', request.attachments)
          }
          // make log
          Log.log(change, user._id, 'Broadcast Request ' + change, 'Broadcast', 'post decide_request database_error', request._id)
          res.render('close window', {'user': req.user})
        }
      })
    }
  })
}

module.exports = {
  SendApproverEmail: sendApproverEmail,
  DecideRequest: decideRequest
}
