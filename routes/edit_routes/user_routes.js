const express = require('express');
const Models = require('../../models/models');
const Messages = require('../../models/message_constants');

const { User, Log } = Models;
const router = express.Router();


router.get('/edit_users', (req, res) => {
  const messages = {
    database: 'The database failed to respond to this request. Please try again or contact IT for support.',
    notFound: 'User could not be found in the database! Please try again or contact IT for help.',
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
  const { username, email, approver } = req.query;
  const [error, status] = [Messages[req.query.error], Messages[req.query.status]];

  return res.render('edit_views/user/new_user', {
    username,
    email,
    approver,
    error,
    status,
    user: req.user
  });
});

router.post('/new_user', (req, res) => {
  const { email, password, confirmPassword } = req.body;
  let { username } = req.body;
  const approver = !!req.body.approver;
  const query = `&username=${username}&email=${email}&approver=${approver}`;

  if (!username || !email || !password || !confirmPassword) {
    return res.redirect(`/new_user?error=missing_fields${query}`);
  }

  if (password !== confirmPassword) {
    return res.redirect(`/new_user?error=passwordMatch${query}`);
  }

  return User.findOne({ username }, (err, user) => {
    if (err) {
      console.log('new_user username_lookup database_error', err);
      return res.redirect('/new_user?error=database');
    }
    if (user) {
      ({ username } = user);
      return res.redirect(`/new_user?error=dupKey${query}`);
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
        return res.redirect('/new_user?error=database');
      }
      Log.log('Created', req.user._id, 'New User Created', 'User', 'post new_user database_error', null, user2._id);
      return res.redirect('/edit_users?status=created');
    });
  });
});

router.get('/edit_user', (req, res) => {
  const { usernameU, emailU, approverU } = req.query;
  const error = Messages[req.query.error];
  const status = Messages[req.query.status];
  const userId = req.query.user;

  return User.findById(userId, (err, user) => {
    if (err) {
      console.log('edit_user user_lookup database_error');
      return res.redirect('/edit_users?error=database');
    }
    if (!user) {
      return res.redirect('/edit_users?error=notFound');
    }
    const [username, email, approver] = [usernameU || user.username, emailU ||
      user.email, approverU || user.approver];
    return res.render('edit_views/user/edit_user', {
      username,
      email,
      approver,
      status,
      error,
      user: req.user,
      profile: user
    });
  });
});

router.post('/edit_user', (req, res) => {
  const { username, email, password } = req.body;
  const approver = !!req.body.approver;
  const userId = req.query.user;
  const query = `&user=${req.query.user}&username=${req.query.username}&email=${req.query.email}&approver=${req.query.approver}`;

  if (!username || !email || !password) {
    return res.redirect(`/edit_user?error=missing_fields${query}`);
  }

  return User.findByIdAndUpdate(userId, {
    username,
    email,
    password,
    approver
  }, (err, user) => {
    if (err) {
      if (err.codeName === 'DuplicateKey') {
        return res.redirect(`/edit_user?error=dupKey${query}`);
      }
      return res.redirect('/edit_users?error=database');
    }
    let title = '';
    if (username !== user.username) {
      title += 'Username_Changed ';
    }
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
    if (title !== '') {
      Log.log('Edited', req.user._id, title, 'User', 'post edit_user database_error', null, user._id);
    }
    return res.redirect('/edit_users?status=saved');
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
