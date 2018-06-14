const express = require('express');
const Models = require('../../models/models');
const Helpers = require('../../helpers/helpers');

const { Log, Group } = Models;
const validateEmail = Helpers.ValidateEmail;
const router = express.Router();

router.get('/edit_groups', (req, res) => {
  const messages = {
    database: 'The database failed to respond to this request. Please try again or contact IT for support.',
    created: 'Group created successfully!',
    updated: 'Group updated succesfully!',
    fail_find: 'The database failed to find this group. Please try again or contact IT for support.',
    deleted: 'Group deleted successfully!'
  };
  const { request } = req.query;
  let alertMsg;
  if (request) {
    alertMsg = messages[req.query.type];
  }
  Group.find({}).then(
    (groups) => {
      res.render('edit_views/group/edit_groups', { user: req.user, request, alertMsg, groups });
    },
    (err) => {
      console.log('edit_groups group_lookup database_error', err);
      res.render('edit_views/group/edit_groups', { user: req.user, request: 'failure', alertMsg: 'Error Fetching Groups From the Database!! Refresh the Page or Contact IT for help.' });
    }
  );
});

router.get('/new_group', (req, res) => {
  const messages = {
    emailFormat: 'Email Format is Incorrect.',
    missing_fields: 'One or more fields are missing. Please complete the form before submitting.',
    dupKey: 'There is already a group with this name. Please choose a different name.'
  };
  let msg;
  if (req.query.msg) {
    msg = messages[req.query.msg];
  }
  const { name, email } = req.query;

  return res.render('edit_views/group/new_group', { user: req.user, msg, name, email });
});

router.post('/new_group', (req, res) => {
  const { name, email } = req.body;

  // validate name and email
  if (!name || !email) {
    return res.redirect(`/new_group?msg=missing_fields&name=${name}&email=${email}`);
  }
  if (!validateEmail(email)) {
    return res.redirect(`/new_group?msg=emailFormat&name=${name}&email=${email}`);
  }

  const newGroup = new Group({
    name,
    email
  });

  return newGroup.save((err, group) => {
    if (err) {
      if (err.code === 11000) {
        return res.redirect(`/new_group?msg=dupKey&name=${name}&email=${email}`);
      }
      console.log('new_group create database_error', err);
      return res.redirect('/edit_groups?request=failure&type=database');
    }
    // make a log;
    Log.log('Created', req.user._id, 'New Group Created', 'Group', 'post new_group database_error', null, null, null, group._id, name);
    return res.redirect('/edit_groups?request=success&type=created');
  });
});

router.get('/edit_group', (req, res) => {
  const messages = { dupKey: 'There is already another group with this name. Please choose another name and try again.' };
  const id = req.query.group;
  const { name, email } = req.query;
  let msg;
  if (req.query.msg) {
    msg = messages[req.query.msg];
    return res.render('edit_views/group/edit_group', { user: req.user, name, email, msg });
  }
  return Group.findById(id).then(
    group => res.render('edit_views/group/edit_group', { user: req.user, name: group.name, email: group.email }),
    (err) => {
      console.log('get edit_group database_error', err);
      return res.redirect('/edit_groups?request=failure&type=fail_find');
    }
  );
});

router.post('/edit_group', (req, res) => {
  const { name, email } = req.body;
  const id = req.query.group;

  if (!name || !email) {
    return res.redirect(`/new_group?group=${id}&msg=missing_fields&name=${name}&email=${email}`);
  }

  // validate email
  if (!validateEmail(email)) {
    return res.redirect(`/new_group?group=${id}&msg=emailFormat&name=${name}&email=${email}`);
  }

  // make sure no duplicate template name
  return Group.findByIdAndUpdate(id, { $set: { name, email } }, (err, group) => {
    if (err) {
      if (err.codeName === 'DuplicateKey') {
        return res.redirect(`/edit_group?group=${id}&msg=dupKey&name=${name}&email=${email}`);
      }
      console.log('edit_group update database_error', err.errmsg);
      return res.redirect('/edit_groups?request=failure&type=database');
    }
    // make a log
    Log.log('Edited', req.user._id, 'Group Edited', 'Group', 'post edit_group database_error', null, null, null, group._id, name);
    return res.redirect('/edit_groups?request=success&type=updated');
  });
});

router.put('/delete_group', (req, res) => {
  const { groupName } = req.body;
  Group.deleteOne({ _id: req.body.id }, (err) => {
    if (err) {
      return res.status(500).send('Database Error, could not delete document.');
    }
    // make a log
    Log.log('Deleted', req.user._id, 'Group Deleted', 'Group', 'put delete_group database_error', null, null, null, null, groupName);
    return res.status(200).send('Document deleted');
  });
});

module.exports = router;
