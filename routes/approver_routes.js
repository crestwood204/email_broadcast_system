/* eslint no-param-reassign: ["error",
{ "props": true, "ignorePropertyModificationsFor": ["x"] }] */

/* eslint no-unused-vars: 1 */
const express = require('express');
const Models = require('../models/models');
const datejs = require('datejs');
const EmailHelpers = require('../helpers/email_helpers');
const ValidationHelpers = require('../helpers/validation_helpers');
const Constants = require('../models/constants');
const Messages = require('../models/message_constants');
const { matchSignature } = require('../helpers/signature_helpers');

// might require path

const router = express.Router();
const { Request, Log } = Models;
const { decideRequest } = EmailHelpers;
const { createSearchObject } = ValidationHelpers;
const { DOCS_PER_PAGE } = Constants;

// route that rejects all non-approvers
router.use((req, res, next) => {
  if (req.user.approver) {
    return next();
  }
  return res.render('error_views/unauthorized');
});


/**
 * Loads the audit log
 * Displays all logs
 */
router.get('/log', (req, res, next) => {
  const page = (parseInt(req.query.page, 10) || 1) || 1; // set to 0 if page is NaN
  const { search } = req.query;

  // create search object
  const searchObj = createSearchObject(search, 'date');

  if (page < 1) {
    return next(new Error('User Malformed Input'));
  }
  /* sort by date approved so that pending requests appear last (pendings don't have dateApproved)
   * makes it so that pages that aren't the last one always have 8 documents displayed
   */
  return Log.countDocuments(searchObj).exec((countErr, count) => {
    if (countErr) {
      console.log(countErr);
      return res.status(500).send('Database Error: "/"');
    }
    let last = parseInt(count / DOCS_PER_PAGE, 10);
    if (count % DOCS_PER_PAGE !== 0) {
      last += 1;
    }
    return Log.find(searchObj)
      .sort({ date: 'descending' })
      .limit(DOCS_PER_PAGE)
      .skip((page - 1) * DOCS_PER_PAGE)
      .populate([{
        path: 'requestId',
        model: 'RequestVersion',
        populate: {
          path: 'createdBy',
          model: 'User'
        }
      }, {
        path: 'user_id',
        model: 'User'
      }, {
        path: 'editUserId',
        model: 'User'
      }, {
        path: 'templateId',
        model: 'Template'
      }, {
        path: 'groupId',
        model: 'Group'
      }])
      .exec((err, logs) => {
        if (err) {
          console.log('log error_fetching_logs database_error', err);
          return res.redirect('/?request=failure');
        }
        logs.sort((a, b) => b.date - a.date);
        const newLogs = logs.map((x) => {
          x.date_string = x.date.format('Y-m-d');
          x.time_string = x.date.format('g:i');
          if (x.time_string.charAt(0) === '0') {
            x.time_string = x.time_string.substring(1);
          }
          const ampm = x.date.getHours() >= 12 ? 'PM' : 'AM';
          x.time_string = `${x.time_string} ${ampm}`;
          return x;
        });
        const startIndex = ((page - 1) * DOCS_PER_PAGE) + 1;
        let [noLogs, noResults] = [false, false];
        if (!search && page === 1 && newLogs.length === 0) {
          noLogs = true;
        }
        if (page === 1 && newLogs.length === 0) {
          noResults = true;
        }
        return res.render('home_views/log', {
          startIndex,
          noLogs,
          noResults,
          search,
          page,
          last,
          add_disabled: true,
          logs: newLogs,
          threeBeforeLast: (last - 3) < page ? page : (last - 3),
          user: req.user,
          endpoint: { endpoint: '/log?' }
        });
      });
  });
});

router.post('/decide_request', (req, res, next) => {
  // edit the request
  const { lastUpdated } = req.body || req.query;
  const approved = req.body.decision === 'approve' || req.query.decision === 'approve';
  const requestId = req.body.id || req.query.request_id;

  if (!requestId) {
    next(new Error('malformed user input'));
  }

  decideRequest(requestId, approved, req, res, lastUpdated);
});


router.get('/pending_broadcast', (req, res) => {
  const { requestId } = req.query;
  const error = Messages[req.query.error];
  Request.findById(requestId)
    .populate({
      model: 'User',
      path: 'createdBy'
    })
    .exec((err, broadcast) => {
      if (err) {
        console.log('Error', err);
      } else {
        const request = broadcast;
        matchSignature(broadcast.body).then((bodyWithSignature) => {
          [, request.body] = bodyWithSignature;
          res.render('home_views/pending_broadcast', { request, error, user: req.user });
        });
      }
    });
});


module.exports = router;
