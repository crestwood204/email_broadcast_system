/* eslint no-param-reassign: ["error",
{ "props": true, "ignorePropertyModificationsFor": ["x"] }] */

/* eslint no-unused-vars: 1 */
const express = require('express');
const Models = require('../models/models');
const datejs = require('datejs');
const Helpers = require('../helpers/helpers');

// might require path

const router = express.Router();
const { User, Request, Log } = Models;
const { decideRequest, decideEmailRequest } = Helpers;

// route that rejects all non-approvers
router.use((req, res, next) => {
  if (req.user.approver) {
    return next();
  }
  return res.render('error_views/unauthorized');
});

router.get('/log', (req, res) => {
  Log.find({})
    .populate([{
      path: 'request_id',
      model: Request,
      populate: {
        path: 'from',
        model: User
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
      return res.render('log', { logs: newLogs, user: req.user });
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
      decideEmailRequest(requestId, user, approved, req, res);
    }
  });
});


module.exports = router;
