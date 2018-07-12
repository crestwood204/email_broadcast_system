/* eslint no-param-reassign: ["error",
{ "props": true, "ignorePropertyModificationsFor": ["x"] }] */

/* eslint no-unused-vars: 1 */
const express = require('express');
const Models = require('../models/models');
const datejs = require('datejs');
const EmailHelpers = require('../helpers/email_helpers');
const ValidationHelpers = require('../helpers/validation_helpers');
const Constants = require('../models/constants');

// might require path

const router = express.Router();
const { User, Request, Log } = Models;
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
    return next(new Error('User Malformed Input')); // TODO: Handle this error
  }
  /* sort by date approved so that pending requests appear last (pendings don't have dateApproved)
   * makes it so that pages that aren't the last one always have 8 documents displayed
   */
  return Log.count(searchObj).exec((countErr, count) => {
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
        path: 'request_id',
        model: 'Request',
        populate: {
          path: 'createdBy',
          model: 'User'
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

router.post('/decide_request', (req, res) => {
  // edit the request
  const approved = req.body.decision === 'approve';
  const requestId = req.body.id;
  decideRequest(requestId, approved, req);
});

router.get('/decide_request_email', (req, res) => {
  const userId = req.query.user_id;
  const requestId = req.query.request_id;
  const approved = req.query.decision === 'approve';


  User.findById(userId, (err, user) => {
    if (err) {
      console.log('decide_request mobile_user_lookup database_error', err);
    } else {
      const options = {
        user,
        res
      };
      decideRequest(requestId, approved, req, options);
    }
  });
});


module.exports = router;
