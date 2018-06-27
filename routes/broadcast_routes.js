/* eslint no-param-reassign: ["error",
{ "props": true, "ignorePropertyModificationsFor": ["x", "req", "request"] }] */
/* eslint no-unused-vars: 1 */
// create routes for app.js
const express = require('express');
const multer = require('multer'); // npm package for file uploads
const datejs = require('datejs');
const Models = require('../models/models');
const EmailHelpers = require('../helpers/email_helpers');
const ValidationHelpers = require('../helpers/validation_helpers');


const { sendApproverEmail } = EmailHelpers;
const { createSearchObject } = ValidationHelpers;
const { User, Request, Log, Group, Template } = Models;
const router = express.Router();
let upload = multer();

const DOCS_PER_PAGE = 8; // defines number of documents to show per page

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
router.get('/', (req, res, next) => {
  const MAX_LENGTH = 45;
  const page = (req.query.page || 1) - 1;
  const { search } = req.query;

  // create search object
  const searchObj = createSearchObject(search);

  if (page < 0) {
    next(new Error('User Malformed Input')); // TODO: Handle this error
  }
  /* sort by date approved so that pending requests appear last (pendings don't have dateApproved)
   * makes it so that pages that aren't the last one always have 8 documents displayed
   */
  Request.find(searchObj)
    .sort({ dateApproved: 'descending' })
    .limit(DOCS_PER_PAGE)
    .skip(page * DOCS_PER_PAGE)
    .populate({
      path: 'createdBy',
      model: 'User'
    })
    .exec((err, requests) => {
      if (err) {
        console.log(err);
        return res.status(500).send('Database Error: "/"');
      }
      let broadcasts = requests ? requests.filter(x => x.approved === true) : [];
      broadcasts = broadcasts.map((x) => {
        x.dateString = x.dateApproved.format('Y-m-d');
        x.subjectString = x.subject.substring(0, MAX_LENGTH);
        if (x.subjectString.length === 45) {
          x.subjectString += ' ...';
        }
        return x;
      });
      const startIndex = (page * DOCS_PER_PAGE) + 1;
      let [noBroadcasts, noResults] = [false, false];
      if (!search && page === 0 && broadcasts.length === 0) {
        noBroadcasts = true;
      }
      if (page === 0 && broadcasts.length === 0) {
        noResults = true;
      }
      return res.render('home_views/home', { broadcasts, startIndex, noBroadcasts, noResults, user: req.user });
    });
});

/**
 * Loads new_request page
 */
router.get('/new_request', (req, res) => {
  const { to, from, subject, body } = req.query;
  Group.find({}).then(
    (groups) => {
      Template.find({}).then(
        (templates) => {
          templates.sort((a, b) => a.name - b.name);
          res.render('new_request', {
            to,
            body,
            from,
            subject,
            templates,
            error: req.query.error,
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
        const query = `to=${request.body.toField}&subject=${request.body.subject}&body=${request.body.body}&from=${request.body.from}`;
        request.fileValidationError = `/new_request?error=file_extension&${query}`;
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
    const { subject, body, from } = req.body;
    const query = `to=${to}&subject=${subject}&body=${body}&from=${from}`;

    if (err) {
      // TODO: format error message if it isn't a validation error
      console.log(err.code);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.redirect(`/new_request?error=limit_file_size&${query}`);
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.redirect(`/new_request?error=limit_unexpected_file&${query}`);
      }
      return res.status(400).send(err);
    }

    if (!to || !subject || !body) {
      return res.redirect(`/new_request?error=missing_fields&${query}`);
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
      createdBy: req.user._id,
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
 * Provides a route for pending requests
 * Approvers see all pending requests
 * Users only see their own pending requests
 */
router.get('/pending_requests', (req, res) => {
  const success = req.query.request === 'success';
  const failed = req.query.request === 'failed';

  // query database for requests
  Request.find({})
    .populate({
      path: 'createdBy',
      model: 'User'
    })
    .exec((err, requests) => {
      if (err) {
        console.log('pending_requests error_fetching requests database_error');
      } else {
        let filteredRequests = requests;
        // if user is not an approver, only show them their requests
        if (!req.user.approver) {
          filteredRequests = requests.filter(x => x.createdBy._id.toString() ===
                  req.user._id.toString());
        }

        // filter so that there are only pending requests
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
