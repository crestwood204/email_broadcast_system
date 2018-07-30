const express = require('express');
const Models = require('../models/models');

// might require path

const router = express.Router();
const { Request } = Models;

router.use('/', (req, res, next) => {
  const { authToken } = req.body;
  if (authToken === process.env.AUTH_TOKEN) {
    return next();
  }
  return res.status(401).json({ error: 'unauthorized', error_msg: 'incorrect auth_token' });
});

// route that returns last 10 broadcasts, configurable with params
router.post('/broadcasts', (req, res) => {
  const searchObj = JSON.parse(req.body.searchObj) || {};
  const limit = parseInt(req.body.limit, 10) || 10;
  const skip = parseInt(req.body.limit, 10) || 0;

  Request.find(searchObj)
    .sort({ dateApproved: 'descending' })
    .limit(limit)
    .skip(skip)
    .exec((requests, err) => {
      if (err) {
        res.json({ error: 'database_error', error_msg: err });
      } else {
        res.json(requests);
      }
    });
});

// route that returns a specific broadcast in json by Id
router.post('/broadcast', (req, res) => {
  const { requestId } = req.body;
  Request.findById(requestId).then(
    (request) => {
      res.json(request);
    },
    (err) => {
      res.json({ error: 'database_error', error_msg: err });
    }
  );
});


module.exports = router;
