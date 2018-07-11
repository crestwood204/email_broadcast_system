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
const Constants = require('../models/constants');
const Messages = require('../models/message_constants');


const { sendApproverEmail } = EmailHelpers;
const { createSearchObject } = ValidationHelpers;
const { User, Request, Log, Group, Template } = Models;
const { DOCS_PER_PAGE, MAX_LENGTH, MAX_FILE_SIZE } = Constants;
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
router.get('/', (req, res, next) => {
  const page = (parseInt(req.query.page, 10) || 1) || 1; // set to 0 if page is NaN
  const { search } = req.query;

  // create search object
  const searchObj = createSearchObject(search);

  if (page < 1) {
    next(new Error('User Malformed Input')); // TODO: Handle this error
  }
  /* sort by date approved so that pending requests appear last (pendings don't have dateApproved)
   * makes it so that pages that aren't the last one always have 8 documents displayed
   */
  return Request.count(searchObj).exec((lastErr, count) => {
    if (lastErr) {
      console.log(lastErr);
      return res.status(500).send('Database Error: "/"');
    }
    let last = parseInt(count / DOCS_PER_PAGE, 10);
    if (count % DOCS_PER_PAGE !== 0) {
      last += 1;
    }
    return Request.find(searchObj)
      .sort({ dateApproved: 'descending' })
      .limit(DOCS_PER_PAGE)
      .skip((page - 1) * DOCS_PER_PAGE)
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
          x.subjectString = x.subject;

          if (x.subject.length > MAX_LENGTH) {
            x.subjectString = `${x.subject.substring(0, MAX_LENGTH)} ...`;
          }

          return x;
        });
        const startIndex = ((page - 1) * DOCS_PER_PAGE) + 1;
        let [noBroadcasts, noResults] = [false, false];
        if (!search && page === 1 && broadcasts.length === 0) {
          noBroadcasts = true;
        }
        if (page === 1 && broadcasts.length === 0) {
          noResults = true;
        }
        return res.render('home_views/home', {
          broadcasts,
          startIndex,
          noBroadcasts,
          noResults,
          search,
          page,
          last,
          threeBeforeLast: (last - 3) < page ? page : (last - 3),
          user: req.user,
          endpoint: { endpoint: '/?', new: '/new_request' }
        });
      });
  });
});

/**
 * Loads new_request page
 */
router.get('/new_request', (req, res) => {
  const { to, from, subject, body, attachments, id } = req.query;
  const error = Messages[req.query.error];
  const status = Messages[req.query.status];
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
            attachments,
            id,
            groups,
            error,
            status,
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
  upload = multer({
    storage: uploadStorage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter(request, file, callback) {
      if (file.mimetype
          && file.mimetype !== 'application/pdf') {
        const query = `to=${request.body.toField}&subject=${request.body.subject}&body=${request.body.body}&from=${request.body.from}&attachments=${request.files}`;
        request.fileValidationError = `/new_request?error=file_extension&${query}`;
        return callback(new Error('extension name not allowed'));
      }
      return callback(null, true);
    }
  }).array('files', 7);
  upload(req, res, (err) => {
    if (req.fileValidationError) {
      return res.json({ redirect: req.fileValidationError });
    }

    // TODO: add locationField support

    let { to } = req.body;
    const { id, subject, body, from, location, attachments } = req.body;
    const query = `to=${to}&subject=${subject}&body=${body}&from=${from}&attachments=${req.files}`;

    if (err) {
      // TODO: format error message if it isn't a validation error
      console.log(err.code);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.json({ redirect: `/new_request?error=limit_file_size&${query}` });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.json({ redirect: `/new_request?error=limit_unexpected_file&${query}` });
      }
      return res.status(400).send({ redirect: '/404' });
    }

    if (!to || !subject || !body) {
      return res.json({ redirect: `/new_request?error=missing_fields&${query}` });
    }

    // convert toField into an array
    to = to.split(',');

    // append filePaths to files * occurs if modifying file attachments while pending *
    if (id) {
      return Request.findByIdAndUpdate(id, {
        $set: {
          to,
          from,
          subject,
          body,
          createdBy: req.user._id,
          attachments: req.files.concat(JSON.parse(attachments))
        }
      }, (updateErr) => {
        if (updateErr) {
          console.log('new_request update database_error', updateErr);
          return res.json({ redirect: '/pending_requests?error=database' });
        }
        return res.json({ redirect: '/pending_requests?request=saved' });
      });
    }

    // save request object
    const newRequest = new Request({
      to,
      from,
      subject,
      body,
      createdBy: req.user._id,
      attachments: req.files,
      dateCreated: new Date()
    });
    return newRequest.save((requestErr, request) => {
      if (requestErr) {
        console.log('new_request save database_error', requestErr);
        return res.json({ redirect: '/pending_requests?error=database' });
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
          return res.json({ redirect: '/pending_requests?status=created' });
        },
        (userErr) => {
          console.log('new_request error_sending_emails database_error', userErr);
          return res.json({ redirect: '/pending_requests?error=database' });
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
router.get('/pending_requests', (req, res, next) => {
  const error = Messages[req.query.error];
  const status = Messages[req.query.status];
  const page = (parseInt(req.query.page, 10) || 1) || 1; // set to 0 if page is NaN
  const { search } = req.query;

  const searchObj = createSearchObject(search); // create search object
  searchObj.pending = true;

  if (page < 1) {
    next(new Error('User Malformed Input')); // TODO: Handle this error
  }

  /* sort by date approved so that pending requests appear first
   * makes it so that pages that aren't the last one always have 8 documents displayed
   */
  return Request.count(searchObj).exec((lastErr, count) => {
    if (lastErr) {
      console.log(lastErr);
      return res.status(500).send('Database Error: "/"');
    }
    let last = parseInt(count / DOCS_PER_PAGE, 10);
    if (count % DOCS_PER_PAGE !== 0) {
      last += 1;
    }
    return Request.find(searchObj)
      .sort({ dateApproved: 'ascending' })
      .limit(DOCS_PER_PAGE)
      .skip((page - 1) * DOCS_PER_PAGE)
      .populate({
        path: 'createdBy',
        model: 'User'
      })
      .exec((err, requests) => {
        if (err) {
          console.log(err);
          return res.status(500).send('Database Error: "/"');
        }
        let pendingRequests = requests;
        // if user is not an approver, only show them their requests
        if (!req.user.approver) {
          pendingRequests = requests ? requests.filter(x => x.createdBy._id.toString() ===
                  req.user._id.toString()) : [];
        }
        // filter so that there are only pending requests
        pendingRequests = requests ? requests.filter(x => x.pending) : [];
        pendingRequests = pendingRequests.map((x) => {
          const attachments = JSON.stringify(x.attachments);
          x.modificationHref = `/new_request?to=${x.to}&subject=${x.subject}&body=${x.body}&from=${x.from}&attachments=${attachments}&id=${x._id}`;
          x.dateString = x.dateCreated.format('Y-m-d');
          x.subjectString = x.subject.substring(0, MAX_LENGTH);
          if (x.subjectString.length === MAX_LENGTH) {
            x.subjectString += ' ...';
          }
          return x;
        });
        const startIndex = ((page - 1) * DOCS_PER_PAGE) + 1;
        let [noBroadcasts, noResults] = [false, false];
        if (!search && page === 1 && pendingRequests.length === 0) {
          noBroadcasts = true;
        }
        if (page === 1 && pendingRequests.length === 0) {
          noResults = true;
        }
        return res.render('home_views/home', {
          startIndex,
          noBroadcasts,
          noResults,
          search,
          page,
          last,
          error,
          status,
          threeBeforeLast: (last - 3) < page ? page : (last - 3),
          user: req.user,
          broadcasts: pendingRequests.reverse(),
          pending: true,
          endpoint: { endpoint: '/pending_requests?', new: 'new_request' }
        });
      });
  });
});

router.get('/broadcast', (req, res) => {
  const { id } = req.query;
  Request.findById(id)
    .populate({
      path: 'createdBy',
      model: 'User'
    })
    .exec((err, request) => {
      if (err) {
        console.log('Error fetching broadcast', err);
      }
      res.render('home_views/broadcast', {
        request,
        user: req.user
      });
    });
});
module.exports = router;
