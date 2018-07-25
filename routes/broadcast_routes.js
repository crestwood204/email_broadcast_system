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
const { matchSignature } = require('../helpers/signature_helpers');

const { sendApproverEmail } = EmailHelpers;
const { createSearchObject } = ValidationHelpers;
const { Request, Log, Group, Template } = Models;
const { DOCS_PER_PAGE, MAX_LENGTH, MAX_FILE_SIZE, DAYS_BEFORE_ARCHIVE } = Constants;
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
  if (!req.user || !req.user.active) {
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
  const searchObj = createSearchObject(search, 'dateApproved');
  searchObj.pending = false;
  searchObj.approved = true;
  if (page < 1) {
    return next(new Error('User Malformed Input')); // TODO: Handle this error
  }
  /* sort by date approved so that pending requests appear last (pendings don't have dateApproved)
   * makes it so that pages that aren't the last one always have 8 documents displayed
   */
  return Request.count(searchObj).exec((lastErr, count) => {
    if (lastErr) {
      console.log(lastErr);
      return res.status(500).send('Database Count Error: "/"');
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
        let broadcasts = requests || [];
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
  const { id } = req.query;
  let { to, from, subject, body, attachments } = req.query;
  const error = Messages[req.query.error];
  const status = Messages[req.query.status];

  const renderRequest = () => {
    Group.find({}).then(
      (groups) => {
        Template.find({}).then(
          (templates) => {
            templates.sort((a, b) => (`${a.name}`).localeCompare(b.name));
            groups.sort((a, b) => (`${a.name}`).localeCompare(b.name));
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
  };

  if (id) {
    Request.findById(id).then(
      (request) => {
        ({ to, from, subject, body, attachments } = request);
        attachments = JSON.stringify(attachments);
        renderRequest();
      },
      (err) => {
        res.status(500).send('Database Error: "new_request templates"', err);
      }
    );
  } else {
    renderRequest();
  }
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
      if (file.mimetype !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' && file.mimetype !== 'application/pdf') {
        return callback(new Error('extension'));
      }
      return callback(null, true);
    }
  }).array('files', 7);
  upload(req, res, (err) => {
    /*
     * req.files are newly attached files from the user
     * attachments are file objects sent from the server to the frontend and back again
     */
    let { to } = req.body;
    const { id, subject, body, from, attachments } = req.body;
    const query = `to=${to}&subject=${subject}&body=${body}&from=${from}&attachments=${req.files}`;

    if (err) {
      // TODO: format error message
      console.log('err:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.json({ redirect: `/new_request?error=limit_file_size&${query}` });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.json({ redirect: `/new_request?error=limit_unexpected_file&${query}` });
      }
      if (err.message === 'extension') {
        return res.json({ redirect: `new_request?error=file_extension&${query}` });
      }
      return res.status(400).send({ redirect: '/404' });
    }

    if (!to || !subject || !body) {
      return res.json({ redirect: `/new_request?error=missing_fields&${query}` });
    }

    // convert toField into an array
    to = to.split(',');

    // if editing request: append filePaths to files
    if (id) {
      return Request.findById(id)
        .then(
          (request) => {
            // if something changed then update
            if (to !== request.to || from !== request.from ||
              subject !== request.subject || body !== request.body ||
              req.files || request.attachments.length !== attachments.length) {
              request.set({
                to,
                from,
                subject,
                body,
                lastUpdated: new Date(),
                createdBy: req.user._id,
                attachments: req.files.concat(JSON.parse(attachments))
              });
              return request.save((updateErr, updatedRequest) => {
                if (updateErr) {
                  console.log('new_request update database_error', updateErr);
                  return res.json({ redirect: '/pending_requests?error=database' });
                }
                Log.log('Edited', req.user._id, 'Broadcast Request Edited', 'Broadcast', 'new_request updated database_error', { requestId: request._id });
                // This code is repeated => Move to email helpers later?
                // send approval email
                return sendApproverEmail(request, req.user.email).then(() => res.json({ redirect: '/pending_requests?status=created' }))
                  .catch((approverEmailErr) => {
                    console.log('new_request error_sending_emails database_error', approverEmailErr);
                    return res.json({ redirect: '/pending_requests?error=database' });
                  });
              });
            }
            // nothing updated
            return res.json({ redirect: '/pending_requests?status=saved' });
          },
          (requestByIdErr) => {
            console.log('requestByIdErr', requestByIdErr);
            return res.json({ redirect: '/pending_requests?error=database' });
          }
        );
    }
    // save request object
    const newDate = new Date();
    const newRequest = new Request({
      to,
      from,
      subject,
      body,
      lastUpdated: newDate,
      createdBy: req.user._id,
      attachments: req.files,
      dateCreated: newDate,
      username: req.user.username
    });
    return newRequest.save((requestErr, request) => {
      if (requestErr) {
        console.log('new_request save database_error', requestErr);
        return res.json({ redirect: '/pending_requests?error=database' });
      }

      // add to log
      Log.log('Create', req.user._id, 'Broadcast Request Created', 'Broadcast', 'post new_request database_error', { requestId: request._id });
      // send emails to approvers
      return sendApproverEmail(request, req.user.email).then(() => res.json({ redirect: '/pending_requests?status=created' }))
        .catch((approverEmailErr) => {
          console.log('new_request error_sending_emails database_error', approverEmailErr);
          return res.json({ redirect: '/pending_requests?error=database' });
        });
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

  const searchObj = createSearchObject(search, 'lastUpdated'); // create search object
  searchObj.pending = true;

  if (page < 1) {
    return next(new Error('User Malformed Input')); // TODO: Handle this error
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

        // archive requests that are over 3 days old
        const archiveRequest = (requestId) => {
          Request.update(
            { _id: requestId }, {
              $set: {
                approved: false,
                pending: false,
                approver: 'System',
                dateApproved: new Date()
              }
            },
            (archiveErr) => {
              if (archiveErr) {
                return console.log('archive_request archive_attempt database_error');
              }
              return Log.log(
                'Archived', requestId, 'Request Archived by System',
                'Broadcast', 'System error, archiving_request', { requestId }
              );
            }
          );
        };
        for (let i = 0; i < requests.length; i += 1) {
          if (Date.parse(requests[i].dateCreated).add({ days: DAYS_BEFORE_ARCHIVE })
            .compareTo(Date.today()) === -1) {
            archiveRequest(requests[i]._id);
          }
        }

        let pendingRequests = requests;
        // if user is not an approver, only show them their requests
        if (!req.user.approver) {
          pendingRequests = requests ? requests.filter(x => x.createdBy._id.toString() ===
                  req.user._id.toString()) : [];
        }
        // filter so that there are only pending requests
        pendingRequests = requests ? requests.filter(x => x.pending) : [];
        return Promise.all(pendingRequests.map(async x => ({
          _id: x._id,
          to: x.to,
          from: x.from,
          subject: x.subject,
          body: await matchSignature(x.body),
          pending: x.pending,
          approver: x.approver,
          approved: x.approved,
          attachments: x.attachments,
          dateApproved: x.dateApproved,
          createdBy: x.createdBy,
          dateCreated: x.dateCreated,
          lastUpdated: x.lastUpdated,
          username: x.username,
          modificationHref: `/new_request?id=${x._id}`,
          dateString: x.dateCreated.format('Y-m-d'),
          subjectString: (x.subject.length >= MAX_LENGTH) ? `${x.subject.substring(0, MAX_LENGTH)} ...` : x.subject.substring(0, MAX_LENGTH)
        }))).then((newRequests) => {
          pendingRequests = newRequests.map((x) => {
            [, x.body] = x.body;
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
        })
          .catch(mappingErr => console.log('pending_requests match_singature error', mappingErr));
      });
  });
});

router.get('/broadcast', (req, res) => {
  const { id, page } = req.query;
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
        page,
        user: req.user
      });
    });
});

router.get('/request_decision', (req, res) => {
  const { requestId } = req.query;
  Request.findById(requestId)
    .then(
      (request) => {
        res.render('request_decision', { request, user: req.user });
      },
      (err) => {
        console.log('database error request decision', err);
        res.status(500).send('Database Error');
      }
    );
});

module.exports = router;
