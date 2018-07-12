/* eslint no-param-reassign: ["error",
{ "props": true, "ignorePropertyModificationsFor": ["x"] }] */
const express = require('express');
const Models = require('../../models/models');
const ValidationHelpers = require('../../helpers/validation_helpers');
const Constants = require('../../models/constants');
const Messages = require('../../models/message_constants');

const { Log, Group } = Models;
const { validateEmail, createEditSearchObject } = ValidationHelpers;
const { EDIT_OBJECTS_PER_PAGE, MAX_LENGTH } = Constants;
const router = express.Router();

router.get('/edit_groups', (req, res, next) => {
  const page = (parseInt(req.query.page, 10) || 1) || 1; // set to 0 if page is NaN
  const { search } = req.query;
  const error = Messages[req.query.error];
  const status = req.query.status ? `Group ${Messages[req.query.status]}` : undefined;
  // create search object
  const searchObj = createEditSearchObject(search, 'group');

  if (page < 1) {
    return next(new Error('User Malformed Input')); // TODO: Handle this error
  }

  return Group.count(searchObj).exec((lastErr, count) => {
    if (lastErr) {
      console.log(lastErr);
      return res.status(500).send('Database Error: "/"');
    }
    let last = parseInt(count / EDIT_OBJECTS_PER_PAGE, 10);
    if (count % EDIT_OBJECTS_PER_PAGE !== 0) {
      last += 1;
    }
    return Group.find(searchObj)
      .collation({ locale: 'en', strength: 2 })
      .sort({ type: 'descending', name: 'ascending' })
      .limit(EDIT_OBJECTS_PER_PAGE)
      .skip((page - 1) * EDIT_OBJECTS_PER_PAGE)
      .exec((err, grps) => {
        if (err) {
          console.log(err);
          return res.status(500).send('Database Error: "/"');
        }

        const groups = grps;
        groups.map((x) => {
          if (x.email.length > MAX_LENGTH) {
            x.email = `${x.email.substring(0, MAX_LENGTH)} ...`;
          }

          if (x.name.length > MAX_LENGTH) {
            x.name = `${x.name.substring(0, MAX_LENGTH)} ...`;
          }

          return x;
        });
        const startIndex = ((page - 1) * EDIT_OBJECTS_PER_PAGE) + 1;
        let [noGroups, noResults] = [false, false];
        if (!search && page === 1 && groups.length === 0) {
          noGroups = true;
        }
        if (page === 1 && groups.length === 0) {
          noResults = true;
        }
        return res.render('edit_views/group/edit_groups', {
          groups,
          startIndex,
          noGroups,
          noResults,
          search,
          page,
          last,
          error,
          status,
          modal: { title: 'Delete Group', text: 'Are you sure you want to delete this group?', type: 'Delete' },
          threeBeforeLast: (last - 3) < page ? page : (last - 3),
          user: req.user,
          endpoint: { endpoint: '/edit_groups?', new: '/new_group', edit: '/edit_group?group' }
        });
      });
  });
});

router.get('/new_group', (req, res) => {
  const { name, email, type, error } = req.query;
  return res.render('edit_views/group/new_group', {
    name,
    email,
    type,
    error,
    user: req.user
  });
});

/*
 * Generates errors for new_group GET: missingFields, emailFormat, dupKey
 * Generates errors for edit_groups GET: database
 * Generates status for edit_groups GET: created
 */
router.post('/new_group', (req, res) => {
  const { name, email } = req.body;
  const type = req.body.type ? 'distribution' : 'sender';
  const query = `&name=${name}&email=${email}&type=${type}`;

  // validate name and email
  if (!name || !email) {
    return res.redirect(`/new_group?error=missingFields${query}`);
  }
  if (!validateEmail(email)) {
    return res.redirect(`/new_group?error=emailFormat${query}`);
  }

  const newGroup = new Group({
    name,
    email,
    type
  });

  return newGroup.save((err, group) => {
    if (err) {
      if (err.code === 11000) {
        return res.redirect(`/new_group?error=dupKey${query}`);
      }
      console.log('new_group create database_error', err);
      return res.redirect('/edit_groups?error=database');
    }
    // make a log;
    Log.log('Created', req.user._id, 'New Group Created', 'Group', 'post new_group database_error', { groupId: group._id, templateName: name });
    return res.redirect('/edit_groups?status=created');
  });
});

router.get('/edit_group', (req, res) => {
  const { group, error } = req.query;
  let { name, email, type } = req.query;
  return Group.findById(group).then(
    (grp) => {
      name = name || grp.name;
      email = email || grp.email;
      type = (type || grp.type) === 'distribution';
      res.render('edit_views/group/edit_group', {
        name,
        email,
        type,
        error,
        user: req.user
      });
    },
    (err) => {
      console.log('get edit_group database_error', err);
      return res.redirect('/edit_groups?error=notFound');
    }
  );
});

router.post('/edit_group', (req, res) => {
  const { name, email } = req.body;
  const type = req.body.type ? 'distribution' : 'sender';
  const id = req.query.group;
  const query = `&group=${id}&name=${name}&email=${email}`;


  if (!name || !email) {
    return res.redirect(`/new_group?error=missing_fields${query}`);
  }

  // validate email
  if (!validateEmail(email)) {
    return res.redirect(`/new_group?error=emailFormat${query}`);
  }

  // make sure no duplicate template name
  return Group.findByIdAndUpdate(id, { $set: { name, email, type } }, (err, group) => {
    if (err) {
      if (err.codeName === 'DuplicateKey') {
        return res.redirect(`/edit_group?error=dupKey${query}`);
      }
      console.log('edit_group update database_error', err.errmsg);
      return res.redirect('/edit_groups?error=database');
    }
    // make a log
    Log.log('Edited', req.user._id, 'Group Edited', 'Group', 'post edit_group database_error', { groupId: group._id, templateName: name });
    return res.redirect('/edit_groups?status=saved');
  });
});

router.put('/delete_group', (req, res) => {
  const { groupName, id } = req.body;
  Group.deleteOne({ _id: id }, (err) => {
    if (err) {
      return res.status(500).send('Database Error, could not delete document.');
    }
    // make a log
    Log.log('Deleted', req.user._id, 'Group Deleted', 'Group', 'put delete_group database_error', { templateName: groupName });
    return res.status(200).send('Document deleted');
  });
});

module.exports = router;
