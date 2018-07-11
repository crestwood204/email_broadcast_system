const express = require('express');
const Models = require('../../models/models');

const { User } = Models;
const router = express.Router();

router.get('/user_settings', (req, res, next) => {
  const { user } = req.query;
  console.log(user);
  User.findById(user).then(
    (profile) => {
      res.render('edit_views/user/edit_user', { user: req.user, profile });
    },
    (err) => {
      console.log('settings user_query database_error', err);
      return next(err);
    }
  );
});

module.exports = router;
