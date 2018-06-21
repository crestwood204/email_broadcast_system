/* eslint no-param-reassign: ["error",
{ "props": true, "ignorePropertyModificationsFor": ["x", "req", "request"] }] */
/* eslint no-unused-vars: 1 */
// create routes for app.js
const express = require('express');
const multer = require('multer'); // npm package for file uploads
const datejs = require('datejs');
const Models = require('../models/models');
const Helpers = require('../helpers/helpers');

const { sendApproverEmail } = Helpers;
const { User, Request, Log, Group, Template } = Models;
const router = express.Router();
let upload = multer();

// configure settings for file upload
const uploadStorage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, './public/uploads');
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
  // redirect to login if not signed in
  if (!req.user) {
    const index = req.url.indexOf('?');
    if (index !== -1) {
      req.session.returnTo = req.path + req.url.substr(index);
    } else {
      req.session.returnTo = req.path;
    }
    return res.redirect('/login');
  }

  // redirect to nonSlashRoute if trying to hit slashRoute
  if (req.url.slice(-1) === '/' && req.url.length > 1) {
    return res.redirect(req.url.substring(0, req.url.length - 1));
  }
  return next();
});

/**
 * Loads the home page
 * Displays Broadcasts that have been sent out
 */
router.get('/', (req, res) => {
  Request.find({})
    .populate({
      path: 'from',
      model: 'User'
    })
    .exec((err, requests) => {
      if (err) {
        res.status(500).send('Database Error: "/"');
      }
      let broadcasts = requests.filter(x => x.approved === true);
      broadcasts.sort((a, b) => b.date - a.date);
      broadcasts = broadcasts.map((x) => {
        x.dateString = x.date.format('Y-m-d');
        return x;
      });
      res.render('home', { broadcasts, user: req.user });
    });
});

/**
 * Loads new_request page
 */
router.get('/new_request', (req, res) => {
  const messages = {
    file_extension: 'One or more files you have attached are unsupported. Only .docx and .pdf files are allowed',
    limit_file_size: 'One of more files you have attached is larger than the max file size - 250 KB',
    missing_fields: 'One or more required fields are not filled out',
    limit_unexpected_file: 'You have attached too many files. Please do not modify the html'
  };
  const [to, subject, body, request] =
    [req.query.to, req.query.subject, req.query.body, req.query.request];
  let alertMsg;
  if (request) {
    alertMsg = messages[req.query.type];
  }
  Group.find({}).then(
    (groups) => {
      Template.find({}).then(
        (templates) => {
          templates.sort((a, b) => a.name - b.name);
          res.render('new_request', {
            to,
            body,
            subject,
            request,
            templates,
            alertMsg,
            groups: groups.map(x => x.name),
            user: req.user
          });
        },
        (err) => {
          res.status(500).send('Database Error: "/new_request templates"', err);
        }
      );
    },
    (err) => {
      res.status(500).send('Database Error: "/new_request groups"', err);
    }
  );
});

/**
 * Handles new_requests
 * Defines file restrictions
 */
router.post('/new_request', (req, res) => {
  const maxSize = 250 * 1024; // 250 KB

  upload = multer({
    storage: uploadStorage,
    limits: { fileSize: maxSize },
    fileFilter(request, file, callback) {
      if (file.mimetype !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          && file.mimetype !== 'application/pdf') {
        const query = `to=${request.body.toField}&subject=${request.body.subject}&body=${request.body.body}`;
        request.fileValidationError = `/new_request?request=failure&type=file_extension&${query}`;
        return callback(new Error('extension name not allowed'));
      }
      return callback(null, true);
    }
  }).array('files', 7); // TODO: change this because want to add a bunch of single file attachments rather than a bunch of attachments from one button
  upload(req, res, (err) => {
    if (req.fileValidationError) {
      return res.redirect(req.fileValidationError);
    }

    // TODO: add locationField support

    let to = req.body.toField;
    const [subject, body, from] =
       [req.body.subject, req.body.body, req.user._id];
    const query = `to=${to}&subject=${subject}&body=${body}`;

    if (err) {
      // TODO: format error message if it isn't a validation error
      console.log(err.code);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.redirect(`/new_request?request=failure&type=limit_file_size&${query}`);
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.redirect(`/new_request?request=failure&type=limit_unexpected_file&${query}`);
      }
      return res.status(400).send(err);
    }

    if (!to || !subject || !body) {
      return res.redirect(`/new_request?request=failure&type=missing_fields&${query}`);
    }

    // convert toField into an array if it is a string
    if (typeof to !== 'object') {
      to = [to];
    }

    // save request object
    const newRequest = new Request({
      to,
      from,
      subject,
      body,
      attachments: req.files
    });
    return newRequest.save((requestErr, request) => {
      if (requestErr) {
        console.log('new_request save database_error', requestErr);
        return res.redirect('/pending_requests?request=failure&type=database', requestErr);
      }

      // add to log
      Log.log('Create', req.user._id, 'Broadcast Request Created', 'Broadcast', 'post new_request database_error', request._id);

      // send emails to approvers
      return User.find({}).then(
        (users) => {
          const approvers = users.filter(x => (x.approver && x.active)).map((x) => {
            const rObj = {
              email: x.email,
              id: x._id
            };
            return rObj;
          });

          sendApproverEmail(approvers, request, req.user.email);
          return res.redirect('/pending_requests?request=success');
        },
        (userErr) => {
          console.log('new_request error_sending_emails database_error', userErr);
          return res.redirect('/pending_requests?request=failure&type=database', userErr);
        }
      );
    });
  });
});

/**
 * Provides a route for the user to load templates from
 */
router.get('/get_templates', (req, res) => {
  Template.find({}).then(
    (templates) => {
      res.status(200).send(JSON.stringify(templates));
    },
    (err) => {
      console.log('get_templates fetch_templates database_error', err);
      res.status(500).send('Database Error While Retrieving Template');
    }
  );
});

/**
 *
 */
router.get('/pending_requests', (req, res) => {
  const success = req.query.request === 'success';
  const failed = req.query.request === 'failed';

  Request.find({})
    .populate({
      path: 'from',
      model: 'User'
    })
    .exec((err, requests) => {
      if (err) {
        console.log('pending_requests error_fetching requests database_error');
      } else {
        let filteredRequests = requests;
        if (!req.user.approver) {
          filteredRequests = requests.filter(x => x.from._id.toString() ===
                  req.user._id.toString());
        }
        const pendingRequests = filteredRequests.filter(x => x.pending);
        res.render('pending_requests', {
          success,
          failed,
          pendingRequests: pendingRequests.reverse(),
          user: req.user
        });
      }
    });
});
module.exports = router;
