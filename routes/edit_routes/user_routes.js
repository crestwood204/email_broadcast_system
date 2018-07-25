const express = require('express');
const Models = require('../../models/models');
const Messages = require('../../models/message_constants');
const Constants = require('../../models/constants');
const ValidationHelpers = require('../../helpers/validation_helpers');

const { User, Log } = Models;
const { EDIT_OBJECTS_PER_PAGE } = Constants;
const router = express.Router();


router.get('/edit_users', (req, res, next) => {
  const page = (parseInt(req.query.page, 10) || 1) || 1; // set to 0 if page is NaN
  const { search } = req.query;
  const [error, status] = [Messages[req.query.error],
    req.query.status ? `User ${Messages[req.query.status]}` : undefined];

  // create search object
  const searchObj = ValidationHelpers.createEditSearchObject(search);

  if (page < 1) {
    return next(new Error('User Malformed Input')); // TODO: Handle this error
  }
  return User.countDocuments(searchObj).exec((lastErr, count) => {
    if (lastErr) {
      console.log(lastErr);
      return res.status(500).send('Database Error: "/"');
    }
    let last = parseInt(count / EDIT_OBJECTS_PER_PAGE, 10);
    if (count % EDIT_OBJECTS_PER_PAGE !== 0) {
      last += 1;
    }
    return User.find(searchObj)
      .collation({ locale: 'en', strength: 2 })
      .sort({ active: 'descending', username: 'ascending' })
      .limit(EDIT_OBJECTS_PER_PAGE)
      .skip((page - 1) * EDIT_OBJECTS_PER_PAGE)
      .exec((err, users) => {
        if (err) {
          console.log(err);
          return res.status(500).send('Database Error: "/"');
        }
        const startIndex = ((page - 1) * EDIT_OBJECTS_PER_PAGE) + 1;
        let [noTemplates, noResults] = [false, false];
        if (!search && page === 1 && users.length === 0) {
          noTemplates = true;
        }
        if (page === 1 && users.length === 0) {
          noResults = true;
        }
        return res.render('edit_views/user/edit_users', {
          users,
          startIndex,
          noTemplates,
          noResults,
          search,
          page,
          last,
          error,
          status,
          modal: {
            title: 'Deactivate User',
            text: 'Are you sure you want to deactivate this user?',
            type: 'Deactivate',
            secondaryTitle: 'Activate User',
            secondaryText: 'Are you sure you want to activate this user?',
            secondaryType: 'Activate'
          },
          threeBeforeLast: (last - 3) < page ? page : (last - 3),
          user: req.user,
          endpoint: { endpoint: '/edit_users?', new: '/new_user', edit: '/edit_user?user' }
        });
      });
  });
});

router.get('/new_user', (req, res) => {
  const { username, email, approver } = req.query;
  const [error, status] = [Messages[req.query.error],
    req.query.status ? `User ${Messages[req.query.status]}` : undefined];

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
      Log.log('Created', req.user._id, 'New User Created', 'User', 'post new_user database_error', { editUserId: user2._id });
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
  const { username, email, password, confirmPassword } = req.body;
  const approver = !!req.body.approver;
  const userId = req.query.user;
  const query = `&user=${req.query.user}&username=${req.query.username}&email=${req.query.email}&approver=${req.query.approver}`;

  if (!username || !email || !password || !confirmPassword) {
    return res.redirect(`/edit_user?error=missing_fields${query}`);
  }

  if (password !== confirmPassword) {
    return res.redirect(`/edit_user?error=passwordMatch${query}`);
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
      Log.log('Edited', req.user._id, title, 'User', 'post edit_user database_error', { editUserId: user._id });
    }
    return res.redirect('/edit_users?status=saved');
  });
});

router.put('/deactivate_user', (req, res) => {
  const { id } = req.body;
  User.findByIdAndUpdate(id, { $set: { active: false } }, (err, user) => {
    if (err) {
      console.log(err);
      return res.status(500).send('database error when deactivating user');
    }
    if (user) {
      Log.log('Deactivated', req.user._id, 'User Deactivated', 'User', 'put deactivate_user database_error', { editUserId: user._id });
      return res.status(200).send('user deactivated');
    }

    return res.status(400).send('user not found');
  });
});

router.put('/activate_user', (req, res) => {
  const { id } = req.body;
  User.findByIdAndUpdate(id, { $set: { active: true } }, (err, user) => {
    if (err) {
      console.log(err);
      return res.status(500).send('datbase error when activating user');
    }
    if (user) {
      Log.log('Activated', req.user._id, 'User Activated', 'User', 'put activate_user database_error', { editUserId: user._id });
      return res.status(200).send('user activated');
    }
    return res.status(400).send('user not found');
  });
});

module.exports = router;
