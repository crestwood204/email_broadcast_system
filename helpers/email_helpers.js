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

/**
  * function to generate HTML of an email broadcast
  * @param {Object} request The request object to be broadcast.
  * @param {string} body Body of request: Might include embedded signature
  * @param {number} approver True if HTML is being sent to approvers - Appends button footer
  * @param {boolean} edit True if the request has been edited - Appends an editedTag
  * @param {string} userEmail The email of the submiter of this request
  * @returns {string} The resulting HTML making up the email
  */
const getHTML = (request, body, approver, edit, userEmail) => {
  const date = new Date();
  const requester = userEmail ? `<div>Requester: ${userEmail}</div>` : '';
  const editedTag = edit ? '<div style="color: red;">This is an edited request</div>' : '';
  const buttons = approver ? `<table cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; color: #ffffff; display: block;">
        <a href="http://10.10.1.79:3000/pending_broadcast?requestId=${request._id}&lastUpdated=${request.lastUpdated.toString()}" style="font-size:16px; font-weight: bold; font-family: ITC New Baskerville Std Roman, Helvetica, Arial, sans-serif; text-decoration: none; line-height:30px; width:100%; display:inline padding: 1px 5px; font-size: 12px; line-height: 1.5; border-radius: 3px;"><span>Details</span></a>
      </td>
    </tr>
  </table>
  ${editedTag}
  <div> Note that you may need to login in order to approve or reject the request</div>
  ` : '';
  return (`
  <html>
    ${requester}
    <p style="margin: 0 0 5px 0;">
      <strong>
        <b style="font-size: 36pt; font-family: Arial,sans-serif;">MEMO</b>
      </strong>
    </p>

    <table border="0" cellspacing="0" cellpadding="0" width="75%" style="width:75.0%; border-collapse:collapse font-size: 8px">
      <tbody>
        <tr>
          <td width="15%" style="width:10.0%; padding: 0;">
            <p style="margin: 0 0 8px 0;"><b style="font-size: 10.0pt; font-family: Arial, sans-serif;">TO: </b></p>
          </td>
          <td width="85%" style="width:90.0%; padding:0in 0in 0in 0in">
            <p style="margin: 0 0 8px 0;"><span style="font-size:10.0pt; font-family:Arial, sans-serif;">${request.to}</span></p>
          </td>
        </tr>
        <tr style="margin: 0 0 2px 0;">
          <td width="15%" style="width:10.0%; padding:0in 0in 0in 0in">
            <p style="margin: 0 0 8px 0;"><b><span style="font-size:10.0pt; font-family: Arial, sans-serif;">FROM: </span></b></p>
          </td>
          <td width="85%" style="width:90.0%; padding:0in 0in 0in 0in">
            <p style="margin: 0 0 8px 0;"><span style="font-size:10.0pt; font-family:Arial, sans-serif;">${request.from}</span></p>
          </td>
        </tr>
        <tr style="margin: 0 0 2px 0;">
          <td width="15%" style="width:10.0%; padding:0in 0in 0in 0in">
            <p style="margin: 0 0 8px 0;"><b><span style="font-size:10.0pt; font-family: Arial, sans-serif;">DATE: </span></b></p>
          </td>
          <td width="85%" style="width:90.0%; padding:0in 0in 0in 0in">
            <p style="margin: 0 0 8px 0;"><span style="font-size:10.0pt; font-family:Arial, sans-serif;">${date.format('l, F')} ${date.format('%d')}<sup>${date.format('S')}</sup>, ${date.format('Y')}</span></p>
          </td>
        </tr>
        <tr style="margin: 0 0 2px 0;">
          <td width="15%" style="width:10.0%; padding:0in 0in 0in 0in">
            <p style="margin: 0 0 8px 0;"><b><span style="font-size: 10.0pt; font-family: Arial, sans-serif;">SUBJECT: </span></b></p>
          </td>
          <td width="85%" style="width:90.0%; padding:0in 0in 0in 0in">
            <p style="margin: 0 0 8px 0;"><span style="font-size: 10.0pt; font-family: Arial, sans-serif;">${request.subject}</span></p>
          </td>
        </tr>
      </tbody>
    </table>
    <div style="border-bottom: 3px double black; padding-top: 9px;"></div>
    <div style="margin-top: 9px;"> ${body} </div>
    ${buttons}
  </html>
  `);
};

/**
 * function to replace a signature .~<username> with an html <img> with appropriate src
 * @param {string} body Body of request: Might include embedded signature
 * @returns {Array} [filename, html with replacement, date of signature last update]
 */
const matchSignature = (body) => {
  const signatureRegex = /\.~[a-zA-Z0-9]*[a-zA-Z]+[a-zA-Z0-9]*/; // regex for username
  const match = body.match(signatureRegex);
  if (match) {
    return User.findOne({ username: match[0].substring(2) }).then(
      (user) => {
        if (!user) {
          return [null, body.replace(match[0], 'user not found'), null];
        }

        if (!user.signature) {
          return [null, body.replace(match[0], 'user does not have an associated signature'), user.signatureLastUpdated];
        }
        const src = user.signature.filename;
        const image = `<img src="cid:${src}"></img>`; // cid is used as an id # for embedded attachments
        return [src, body.replace(match[0], image), user.signatureLastUpdated];
      },
      (matchErr) => {
        console.log('Error:', matchErr);
        return [null, body.replace(match[0], 'signature failed to upload'), null];
      }
    );
  }
  // above returns a Promise, so if nothing happens, return a Promise that does nothing
  return new Promise((resolve) => {
    resolve([null, body]);
  });
};

/**
  * function to send emails to all approvers
  * @param {Object} request The request object to be broadcast.
  * @param {string} userEmail The email of the submiter of this request
  * @param {number} requestEdited True if the request has been edited
  * @returns {Object} undefined - returns nothing, only sends approver emails
  */
const sendApproverEmail = (request, userEmail, requestEdited) => {
  let html;
  let mailOptions;
  let files = request.attachments;

  // get approvers
  return User.find({ approver: true, active: true }).then(
    (users) => {
      const approvers = users.map((x) => {
        const rObj = {
          email: x.email,
          id: x._id
        };
        return rObj;
      });

      // map attachments
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

      // replace signatures with image tags
      return matchSignature(request.body)
        .then((bodyWithSignature) => {
          // add on signature as embedded image
          if (bodyWithSignature[0]) {
            const signature = {
              filename: bodyWithSignature[0],
              path: `./public/user_data/signatures/${bodyWithSignature[0]}`,
              cid: bodyWithSignature[0]
            };

            // append signature file to files sent
            if (files) {
              files.push(signature);
            } else {
              files = [signature];
            }
          }
          // send email to approvers
          approvers.forEach((user) => {
            html = getHTML(
              request, bodyWithSignature[1], true,
              requestEdited, userEmail
            );

            mailOptions = {
              from: process.env.BROADCAST_ADDRESS, // sender address
              to: '', // don't send this to anyone
              bcc: user.email, // bcc all approvers
              subject: 'BROADCAST REQUEST', // Subject line
              text: bodyWithSignature[1], // plain text body
              html, // html body
              attachments: files // file attachments
            };

            // send mail with defined transport object
            transporter.sendMail(mailOptions, (error) => {
              if (error) {
                return console.log('send mail error', error);
              }
              return console.log(`email approval sent to ${user.email}`);
            });
          });
          return true;
        })
        .catch(matchSignatureError => Promise.reject(matchSignatureError));
    },
    approverErr => Promise.reject(approverErr)
  );
};

/**
  * function to remove files from directory
  * @param {string} dirPath The directory to look in
  * @param {Array} attachments The attachments to remove
  * @returns {Object} undefined - removes specified files
  */
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

/**
  * function to broadcast the email
  * @param {Object} request The request object to be broadcast
  * @returns {Object} undefined
  */
const sendBroadcastEmail = (request) => {
  let files = request.attachments;

  // map attachments
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

  // replace signature code .~<username> with img tag
  matchSignature(request.body)
    .then((bodyWithSignature) => {
      // add on signature as embedded image
      if (bodyWithSignature[0]) {
        const signature = {
          filename: bodyWithSignature[0],
          path: `./public/user_data/signatures/${bodyWithSignature[0]}`,
          cid: bodyWithSignature[0]
        };

        // include embedded image as an attachment
        if (files) {
          files.push(signature);
        } else {
          files = [signature];
        }
      }

      // generate the HTML for a broadcast email
      const html = getHTML(request, bodyWithSignature[1]);

      // turn list of group names into list of email addresses
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

/**
  * function to handle deciding requests
  * @param {ObjectId} requestId The request object to be decided.
  * @param {boolean} approved True if request was approved, False otherwise
  * @param {Object} req The request express object - Contains information about the User
  * @param {Object} res The response express object - Used to send data to the user.
  * @param {Date} lastUpdated The date/time at which the request the user clicked on was updated
  * @returns {string} The resulting HTML making up the email
  */
const decideRequest = (requestId, approved, req, res, lastUpdated) => {
  const change = approved ? 'Approved' : 'Rejected';
  if (!req.user.approver) {
    return console.log('decide_request unauthorized_user attempted_request_decision');
  }

  // lookup the request
  return Request.findById(requestId, (requestErr, request) => {
    if (requestErr) {
      return console.log('decide_request request_lookup database_error', requestErr);
    }
    if (!request) {
      return console.log('decide_request request_lookup request_does-not-exist');
    }
    // only continue if the request is still pending
    if (request.pending) {
      const stringDate = request.lastUpdated.toString();
      // check if request has been updated since this email was sent
      if (stringDate !== lastUpdated) {
        // render specific pending_broadcast view
        return res.json({ error: 'updatedRequest' });
      }

      // check if there is a signature in this request
      return matchSignature(request.body)
        .then((bodyWithSignature) => {
          if (bodyWithSignature[0]) {
            // check if the signature has been updated since this request has been updated
            const signatureLastUpdated = bodyWithSignature[2];
            const requestLastUpdated = request.lastUpdated;
            // if so, render updated request in pending_broadcast view
            if (signatureLastUpdated && signatureLastUpdated.compareTo(requestLastUpdated) === 1) {
              // update request
              return Request.update(
                { _id: requestId }, { $set: { lastUpdated: new Date() } },
                (updateErr) => {
                  if (updateErr) {
                    return console.log('database error', updateErr);
                  }
                  return res.json({ error: 'updatedRequest' });
                }
              );
            }
          }
          // if request is pending and current, check if approved
          if (approved) {
            // update the request
            return Request.update(
              { _id: requestId }, {
                $set: {
                  approved,
                  pending: false,
                  approver: req.user.username,
                  dateApproved: new Date()
                }
              },
              (updateErr) => {
                if (updateErr) {
                  return console.log('decide_request update database_error', updateErr);
                }
                // broadcast email
                sendBroadcastEmail(request);

                return Log.log(change, req.user._id, `Broadcast Request ${change}`, 'Broadcast', 'post decide_request database_error', { requestId: request._id });
              }
            );
          }
          // If broadcast was rejected:

          // remove uploads
          rmDir('./public/uploads', request.attachments);

          // Log reject
          Log.log(change, req.user._id, `Broadcast Request ${change}`, 'Broadcast', 'post decide_request database_error', { requestId: request._id });

          // reject request
          return Request.update(
            { _id: requestId }, {
              $set: {
                approved,
                pending: false,
                approver: req.user.username,
                dateApproved: new Date()
              }
            },
            (archiveErr) => {
              if (archiveErr) {
                return console.log('archive_request archive_attempt database_error');
              }
              return true;
            }
          );
        })
        .catch(err => console.log('Error', err));
    }
    // broadcast was already processed by another approver
    // it is no longer pending - render requestDecision view
    return res.json({ error: 'requestDecision' });
  });
};

module.exports = {
  sendApproverEmail,
  decideRequest,
  rmDir
};
