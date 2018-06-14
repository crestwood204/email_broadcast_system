const express = require('express');
const Models = require('../../models/models');

const { User, Log } = Models;
const router = express.Router();


router.get('/edit_users', (req, res) => {
  const messages = {
    database: 'The database failed to respond to this request. Please try again or contact IT for support.',
    not_found: 'User could not be found in the database! Please try again or contact IT for help.',
    deactivated: 'User deactivated successfully!',
    activated: 'User activated successfully',
    updated: 'User updated succesfully!',
    created: 'User created successfully!'
  };
  const { request } = req.query;
  let alertMsg;
  if (request) {
    alertMsg = messages[req.query.type];
  }
  User.find({}).then(
    (users) => {
      users.sort((a, b) => (`${a.username}`).localeCompare(b.username));
      return res.render('edit_views/user/edit_users', { users, request, alertMsg, user: req.user });
    },
    (err) => {
      console.log('edit_users fetch database_error', err);
    }
  );
});

router.get('/new_user', (req, res) => {
  const messages = {
    username_taken: 'Username is taken. Please choose a different username.',
    password_match: 'Passwords did not match',
    database: 'The database failed to respond to this request. Please try again or contact IT for support.',
    missing_fields: 'One or more fields are missing. Please complete the form before submitting'
  };
  const { request } = req.query;
  let alertMsg;
  if (request) {
    alertMsg = messages[req.query.type];
  }
  return res.render('edit_views/user/new_user', { user: req.user, request, alertMsg });
});

router.post('/new_user', (req, res) => {
  const { username, email, password, confirmPassword } = req.body;
  const approver = !!req.body.approver;

  if (!username || !email || !password || !confirmPassword) {
    return res.redirect('/new_user?request=failure&type=missing_fields');
  }

  if (password !== confirmPassword) {
    return res.redirect('/new_user?request=failure&type=password_match');
  }
  return User.findOne({ username }, (err, user) => {
    if (err) {
      console.log('new_user username_lookup database_error', err);
      return res.redirect('/new_user?request=failure&type=database');
    }
    if (user) {
      return res.redirect('/new_user?request=failure&type=username_taken');
    }
    const newUser = new User({
      username,
      email,
      password,
      approver
    });
    return newUser.save((userErr, user2) => {
      if (userErr) {
        console.log('new_user save database_error', err);
        return res.redirect('/new_user?request=failure&type=database');
      }
      Log.log('Created', req.user._id, 'New User Created', 'User', 'post new_user database_error', null, user2._id);
      return res.redirect('/edit_users?request=success&type=created');
    });
  });
});

router.get('/edit_user', (req, res) => {
  const messages = { missing_fields: 'One or more fields are missing. Please complete the form before submitting.' };
  const { request } = req.query;
  let alertMsg;
  if (request) {
    alertMsg = messages[req.query.type];
  }
  return User.findById(req.query.user, (err, user) => {
    if (err) {
      console.log('edit_user user_lookup database_error');
      return res.redirect('/edit_users', 'request=failure&type=database');
    }
    if (!user) {
      return res.redirect('/edit_users?request=failure&type=not_found');
    }
    return res.render('edit_views/user/edit_user', { user: req.user, profile: user, request, alertMsg });
  });
});

router.post('/edit_user', (req, res) => {
  const { email, password } = req.body;
  const approver = !!req.body.approver;
  if (!email || !password) {
    return res.redirect(`/edit_user?user=${req.query.user}&request=failure&type=missing_fields`);
  }
  return User.findByIdAndUpdate(req.query.user, {
    email,
    password,
    approver
  }, (err, user) => {
    if (err) {
      console.log('edit_user post_edit database_error', err);
      return res.redirect('/edit_users?request=failure&type=database');
    }
    let title = '';
    if (email !== user.email) {
      title += 'Email_Changed ';
    }
    if (password !== user.password) {
      title += 'Password_Changed ';
    }
    if (approver !== user.approver) {
      if (approver) {
        title += 'Promoted ';
      } else {
        title += 'Demoted ';
      }
    }
    title = title.trim().split(' ').join(', ');

    // nothing was edited, so don't make a log
    if (title === '') {
      return res.redirect('/edit_users?request=success&type=updated');
    }
    Log.log('Edited', req.user._id, title, 'User', 'post edit_user database_error', null, user._id);
    return res.redirect('/edit_users?request=success&type=updated');
  });
});

router.put('/deactivate_user', (req, res) => {
  const { username } = req.body;
  User.findOneAndUpdate({ username }, { $set: { active: false } }, (err, user) => {
    if (err) {
      res.status(500).send('database error when deactivating user');
    }
    if (user) {
      Log.log('Deactivated', req.user._id, 'User Deactivated', 'User', 'put deactivate_user database_error', null, user._id);
      res.status(200).send('user deactivated');
    } else {
      res.status(500).send('database error when deactivating user');
    }
  });
});

router.put('/activate_user', (req, res) => {
  const { id } = req.body;
  User.findByIdAndUpdate(id, { $set: { active: true } }, (err, user) => {
    if (err) {
      res.status(500).send('datbase error when activating user');
    }
    Log.log('Activated', req.user._id, 'User Activated', 'User', 'put activate_user database_error', null, user._id);
    res.status(200).send('user activated');
  });
});

module.exports = router;
