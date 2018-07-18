const nodemailer = require('nodemailer');
const Models = require('../models/models');
const fs = require('fs');

const { User, Group, Request, Log } = Models;

// create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.HOST_IP,
  port: 25,
  tls: { rejectUnauthorized: false }
});

const matchSignature = (body) => {
  const signatureRegex = /\.~[a-zA-Z0-9]*[a-zA-Z]+[a-zA-Z0-9]*/; // regex for username
  const match = body.match(signatureRegex);
  if (match) {
    return User.findOne({ username: match[0].substring(2) }).then(
      (user) => {
        if (!user) {
          return [null, body.replace(match[0], 'user not found')];
        }

        if (!user.signature) {
          return [null, body.replace(match[0], 'user does not have an associated signature')];
        }
        const src = user.signature.filename;
        const image = `<img src="cid:${src}"></img>`;
        return [src, body.replace(match[0], image)];
      },
      (matchErr) => {
        console.log('Error:', matchErr);
        return [null, body.replace(match[0], 'signature failed to upload')];
      }
    );
  }
  return new Promise((resolve) => {
    resolve([null, body]);
  });
};
// consolidate email functions?
const sendApproverEmail = (approvers, request, userEmail, requestEdited) => {
  let html;
  let mailOptions;
  let editedTag = '';
  let files = request.attachments;

  if (files) {
    files = files.map((x) => {
      const rObj = {
        filename: x.originalname,
        encoding: x.encoding,
        path: x.path
      };
      return rObj;
    });
  }

  if (requestEdited) {
    editedTag = '<div style="color: red;">This is an edited request</div>';
  }
  matchSignature(request.body)
    .then((bodyWithSignature) => {
      // add on signature as embedded image
      if (bodyWithSignature[0]) {
        const signature = {
          filename: bodyWithSignature[0],
          path: `./public/user_data/signatures/${bodyWithSignature[0]}`,
          cid: bodyWithSignature[0]
        };
        if (files) {
          files.push(signature);
        } else {
          files = [signature];
        }
      }
      // send email to approvers
      approvers.forEach((user) => {
        html = `<html>
          <head>
            <style>

            </style>
          </head>
          <body>
            <div> Requester: ${userEmail} </div>
            <div> Broadcast To: ${request.to} </div>
            <div class="divider-top"> Subject: ${request.subject} </div>
            <div class="divider-top"> ${bodyWithSignature[1]} </div>
              <table cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" bgcolor="#d9534f" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;">
                    <a href="http://10.10.1.79:3000/decide_request_email?user_id=${user.id}&request_id=${request._id}&lastUpdated=${request.lastUpdated.toString()}&decision=reject" style="font-size:16px; font-weight: bold; font-family: ITC New Baskerville Std Roman, Helvetica, Arial, sans-serif; text-decoration: none; line-height:30px; width:100%; display:inline padding: 1px 5px; font-size: 12px; line-height: 1.5; border-radius: 3px;"><span style="color: #FFFFFF">Reject</span></a>
                  </td>
                  <td align="center" display="inline-block" width="10px"> </td>
                  <td align="center" bgcolor="#449d44" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;">
                    <a href="http://10.10.1.79:3000/decide_request_email?user_id=${user.id}&request_id=${request._id}&lastUpdated=${request.lastUpdated.toString()}&decision=approve" style="font-size:16px; font-weight: bold; font-family: ITC New Baskerville Std Roman, Helvetica, Arial, sans-serif; text-decoration: none; line-height:30px; width:100%; display:inline; padding: 1px 5px; font-size: 12px; line-height: 1.5; border-radius: 3px;"><span style="color: #FFFFFF">Approve</span></a>
                  </td>
                </tr>
              </table>
              ${editedTag}
              <div> Note that you may need to login in order to approve or reject the request - In this case, you must login before you can approve or reject a broadcast request.</div>
          </body>
        </html>`;

        mailOptions = {
          from: process.env.BROADCAST_ADDRESS, // sender address
          to: '', // list of receivers
          bcc: user.email,
          subject: 'BROADCAST REQUEST', // Subject line
          text: bodyWithSignature[1], // plain text body
          html, // html body
          attachments: files // file attachments
        };

        // send mail with defined transport object
        transporter.sendMail(mailOptions, (error) => { // callback contains (error, info)
          if (error) {
            return console.log('send mail error', error);
          }
          return console.log(`email approval sent to ${user.email}`);
        });
      });
    })
    .catch((matchSignatureError) => {
      console.log('match signature error', matchSignatureError);
    });
};

const rmDir = (dirPath, attachments) => {
  try {
    fs.readdirSync(dirPath);
  } catch (e) {
    console.log('Error removing uploads from server', e);
  }
  const mappedAttachments = attachments.map(x => `./${x.path}`);
  mappedAttachments.forEach((filePath) => {
    try {
      if (fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      console.log('Error: ', e);
    }
  });
};

const sendBroadcastEmail = (request) => {
  const date = new Date();
  let files = request.attachments;
  matchSignature(request.body)
    .then((bodyWithSignature) => {
      // add on signature as embedded image
      if (bodyWithSignature[0]) {
        const signature = {
          filename: bodyWithSignature[0],
          path: `./public/user_data/signatures/${bodyWithSignature[0]}`,
          cid: bodyWithSignature[0]
        };
        if (files) {
          files.push(signature);
        } else {
          files = [signature];
        }
      }
      const html = `<html>
        <p>
          <strong>
            <b style="font-size:36.0pt; font-family:Arial,sans-serif">MEMO</b>
          </strong>
        </p>
        <table class="MsoNormalTable" border="0" cellspacing="0" cellpadding="0" width="75%" style="width:75.0%; border-collapse:collapse font-size: 8px">
          <tbody>
            <tr>
              <td width="10%" style="width:10.0%; padding:0in 0in 0in 0in">
                <p class="MsoNormal"><b style="font-size:10.0pt; font-family:Arial,sans-serif">TO: </b></p>
              </td>
              <td width="90%" style="width:90.0%; padding:0in 0in 0in 0in">
                <p class="MsoNormal"><span style="font-size:10.0pt; font-family:Arial,sans-serif">${request.to}</span></p>
              </td>
            </tr>
            <tr>
              <td width="10%" style="width:10.0%; padding:0in 0in 0in 0in">
                <p class="MsoNormal"><b><span style="font-size:10.0pt; font-family:Arial,sans-serif">FROM: </span></b></p>
              </td>
              <td width="90%" style="width:90.0%; padding:0in 0in 0in 0in">
                <p class="MsoNormal"><span style="font-size:10.0pt; font-family:Arial,sans-serif">${request.from}</span></p>
              </td>
            </tr>
            <tr>
              <td width="10%" style="width:10.0%; padding:0in 0in 0in 0in">
                <p class="MsoNormal"><b><span style="font-size:10.0pt; font-family:Arial,sans-serif">DATE: </span></b></p>
              </td>
              <td width="90%" style="width:90.0%; padding:0in 0in 0in 0in">
                <p class="MsoNormal"><span style="font-size:10.0pt; font-family:Arial,sans-serif">${date.format('l, F')} ${date.format('j')}<sup>${date.format('S')}</sup>, ${date.format('Y')}</span></p>
              </td>
            </tr>
            <tr>
            </tr>
            <tr>
              <td width="10%" style="width:10.0%; padding:0in 0in 0in 0in">
                <p class="MsoNormal"><b><span style="font-size:10.0pt; font-family:Arial,sans-serif">SUBJECT: </span></b></p>
              </td>
              <td width="90%" style="width:90.0%; padding:0in 0in 0in 0in">
                <p class="MsoNormal"><span style="font-size:10.0pt; font-family:Arial,sans-serif">${request.subject}</span></p>
              </td>
            </tr>
          </tbody>
        </table>
        <div style="border:none; border-bottom:double windowtext 2.25pt; padding:0in 0in 1.0pt 0in">
          <p class="MsoNormal" style="border:none; padding:0in">&nbsp;</p>
        </div>
        <div> ${bodyWithSignature[1]} </div>
      </html>`;

      Group.find({}).then(
        (groups) => {
          let filteredGroups = groups.filter(x => request.to.includes(x.name));
          filteredGroups = filteredGroups.map(x => x.email);
          const mailOptions = {
            from: groups.filter(x => x.name === request.from)[0].email, // sender address
            to: '', // list of receivers
            bcc: filteredGroups,
            subject: request.subject, // Subject line
            text: bodyWithSignature[1], // plain text body
            html, // html body
            attachments: files
          };
          // send mail with defined transport object
          transporter.sendMail(mailOptions, (error) => { // callback contains (error, info)
            if (error) {
              return console.log('err', error);
            }
            return console.log('email broadcast sent');

            // don't delete attachments from server directory
          });
        },
        (err) => {
          console.log('sendEmail error_fetching_groups database_error', err);
        }
      );
    });
};

const decideRequest = (requestId, approved, req, res, lastUpdated, options) => {
  const user = options ? options.user : false;

  const change = approved ? 'Approved' : 'Rejected';
  if (!req.user.approver) {
    if (options) {
      return res.render('error_views/unauthorized');
    }
    return console.log('decide_request unauthorized_user attempted_request_decision');
  }
  return Request.findById(requestId, (requestErr, request) => {
    if (requestErr) {
      if (options) {
        return res.redirect('/?error=database');
      }
      return console.log('decide_request request_lookup database_error', requestErr);
    }
    if (!request) {
      if (options) {
        return res.redirect('/?error=notFound');
      }
      return console.log('decide_request request_lookup request_does-not-exist');
    }

    const stringDate = request.lastUpdated.toString();
    // check if request has been updated since this email was sent
    if (stringDate !== lastUpdated) {
      // render specific pending_request view
      if (options) {
        return res.redirect(`/pending_broadcast?request=${requestId}`);
      }
      return res.json({ error: 'updatedRequest' });
    }

    if (request.pending) {
      if (approved) {
        return Request.update(
          { _id: requestId }, {
            $set: {
              approved,
              pending: false,
              approver: options ? user.username : req.user.username,
              dateApproved: new Date()
            }
          },
          (updateErr) => {
            if (updateErr) {
              if (options) {
                return res.redirect('/?error=database');
              }
              return console.log('decide_request update database_error', updateErr);
            }
            // broadcast email
            sendBroadcastEmail(request);

            // make log
            if (options) {
              Log.log(change, user._id, `Broadcast Request ${change}`, 'Broadcast', 'post decide_request database_error', { requestId: request._id });
              return res.render('close_window', { user: req.user });
            }
            return Log.log(change, req.user._id, `Broadcast Request ${change}`, 'Broadcast', 'post decide_request database_error', { requestId: request._id });
          }
        );
      }
      // remove uploads
      rmDir('./public/uploads', request.attachments);

      // Log
      Log.log(change, options ? user._id : req.user._id, `Broadcast Request ${change}`, 'Broadcast', 'post decide_request database_error', { requestId: request._id });

      // remove request
      return Request.deleteOne({ _id: requestId }, (deleteErr) => {
        if (deleteErr) {
          return console.log('decide_request delete_attempt database_error');
        }
        return true;
      });
    }

    // broadcast was already processed by another approver
    if (options) {
      return res.redirect(`request_decision?requestId=${request._id}`);
    }
    return res.json({ error: 'requestDecision' });
  });
};

module.exports = {
  sendApproverEmail,
  decideRequest,
  rmDir
};
