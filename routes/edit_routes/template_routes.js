/* eslint no-param-reassign: ["error",
{ "props": true, "ignorePropertyModificationsFor": ["x"] }] */
const express = require('express');
const Models = require('../../models/models');
const Constants = require('../../models/constants');
const Messages = require('../../models/message_constants');

const { Log, Template } = Models;
const { TEMPLATES_PER_PAGE, MAX_TEMPLATE_LINE_LENGTH } = Constants;
const router = express.Router();

router.get('/edit_templates', (req, res, next) => {
  const page = (parseInt(req.query.page, 10) || 1) || 1; // set to 0 if page is NaN
  const { search } = req.query;
  const error = Messages[req.query.error];
  const status = req.query.status ? `Template ${Messages[req.query.status]}` : undefined;
  // create search object
  const searchObj = {}; // createEditSearchObject(search);

  if (page < 1) {
    next(new Error('User Malformed Input')); // TODO: Handle this error
  }
  /* sort by date approved so that pending requests appear last (pendings don't have dateApproved)
   * makes it so that pages that aren't the last one always have 8 documents displayed
   */
  return Template.count(searchObj).exec((lastErr, count) => {
    if (lastErr) {
      console.log(lastErr);
      return res.status(500).send('Database Error: "/"');
    }
    let last = parseInt(count / TEMPLATES_PER_PAGE, 10);
    if (count % TEMPLATES_PER_PAGE !== 0) {
      last += 1;
    }
    return Template.find(searchObj)
      .sort({ name: 'ascending' })
      .limit(TEMPLATES_PER_PAGE)
      .skip((page - 1) * TEMPLATES_PER_PAGE)
      .populate({
        path: 'createdBy',
        model: 'User'
      })
      .exec((err, temps) => {
        if (err) {
          console.log(err);
          return res.status(500).send('Database Error: "/"');
        }
        const templates = temps;
        templates.map((x) => {
          if (x.subject.length > MAX_TEMPLATE_LINE_LENGTH) {
            x.subject = `${x.subject.substring(0, MAX_TEMPLATE_LINE_LENGTH)} ...`;
          }

          if (x.name.length > MAX_TEMPLATE_LINE_LENGTH) {
            x.name = `${x.name.substring(0, MAX_TEMPLATE_LINE_LENGTH)} ...`;
          }

          return x;
        });
        const startIndex = ((page - 1) * TEMPLATES_PER_PAGE) + 1;
        let [noTemplates, noResults] = [false, false];
        if (!search && page === 1 && templates.length === 0) {
          noTemplates = true;
        }
        if (page === 1 && templates.length === 0) {
          noResults = true;
        }
        return res.render('edit_views/template/edit_templates', {
          templates,
          startIndex,
          noTemplates,
          noResults,
          search,
          page,
          last,
          error,
          status,
          modal: { title: 'Delete Template', text: 'Are you sure you want to delete this template?', type: 'Delete' },
          threeBeforeLast: (last - 3) < page ? page : (last - 3),
          user: req.user,
          endpoint: { endpoint: '/edit_templates?', new: '/new_template', edit: '/edit_template?template' }
        });
      });
  });
});

router.get('/new_template', (req, res) => {
  const { name, subject, body, error } = req.query;
  return res.render('edit_views/template/new_template', {
    name,
    subject,
    body,
    error,
    user: req.user
  });
});

router.post('/new_template', (req, res) => {
  const { name, subject, body } = req.body;
  const createdBy = req.user._id;
  if (!name || !subject || !body) {
    return res.redirect(`/new_template?error=missing_fields&name=${name}&subject=${subject}&body=${body}`);
  }
  const newTemplate = new Template({
    name,
    subject,
    body,
    createdBy
  });

  return newTemplate.save((err, template) => {
    if (err) {
      console.log('new_template save datbase_error');
      return res.redirect('/edit_templates?error=database');
    }
    Log.log('Created', req.user._id, 'New Template Created', 'Template', 'post new_template database_error', null, null, template._id, null, name);
    return res.redirect('/edit_templates?status=created');
  });
});

router.get('/edit_template', (req, res) => {
  const { nameT, subjectT, bodyT } = req.query;
  const error = Messages[req.query.error];
  const templateId = req.query.template;
  Template.findById(templateId, (err, template) => {
    if (err) {
      console.log('edit_template template_lookup database_error');
      return res.redirect('/edit_templates?error=database');
    }
    if (!template) {
      return res.redirect('/edit_templates?error=not_found');
    }
    const [name, subject, body] = [nameT || template.name, subjectT ||
      template.subject, bodyT || template.body];
    return res.render('edit_views/template/edit_template', {
      name,
      subject,
      body,
      error,
      user: req.user
    });
  });
});

router.post('/edit_template', (req, res) => {
  console.log('hi');
  const { name, subject, body } = req.body;
  const templateId = req.query.template;

  if (!name || !subject || !body) {
    return res.redirect(`/edit_template?template=${templateId}&error=missing_fields`);
  }

  return Template.findByIdAndUpdate(templateId, {
    name,
    subject,
    body
  }, (err, template) => {
    if (err) {
      console.log('edit_template post_edit database_error');
      return res.redirect('/edit_templates?error=database');
    }
    let logTitle = '';
    if (name !== template.name) {
      logTitle += 'Title_Changed ';
    }
    if (subject !== template.subject) {
      logTitle += 'Subject_Changed ';
    }
    if (body !== template.body) {
      logTitle += 'Body_Changed ';
    }

    logTitle = logTitle.trim().split(' ').join(', ');

    // nothing was edited, so don't make a log
    if (logTitle !== '') {
      Log.log('Edited', req.user._id, logTitle, 'Template', 'post edit_template database_error', null, null, template._id, null, name);
    }
    return res.redirect('/edit_templates?status=saved');
  });
});

router.put('/delete_template', (req, res) => {
  const { id, name } = req.body;
  Template.deleteOne({ _id: id }, (err) => {
    if (err) {
      console.log('put delete_template database_error');
    } else {
      // make a log
      Log.log('Deleted', req.user._id, 'Template Deleted', 'Template', 'put delete_template database_error', null, null, null, null, name);
      res.send('Template Deleted Successfully');
    }
  });
});

module.exports = router;
