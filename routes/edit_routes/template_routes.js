/* eslint no-param-reassign: ["error",
{ "props": true, "ignorePropertyModificationsFor": ["x"] }] */
const express = require('express');
const Models = require('../../models/models');
const Constants = require('../../models/constants');

const { Log, Template } = Models;
const { DOCS_PER_PAGE, MAX_LENGTH } = Constants;
const router = express.Router();

// router.get('/edit_templates', (req, res) => {
//   const messages = {
//     database: 'The database failed to respond to this request. Please try again or contact IT for support.',
//     not_found: 'Template could not be found in the database! Please try again or create a new template.',
//     deleted: 'Template deleted successfully!',
//     updated: 'Template updated succesfully!',
//     created: 'Template created successfully!'
//   };
//   const { request } = req.query;
//   let alertMsg;
//   if (request) {
//     alertMsg = messages[req.query.type];
//   }
//   Template.find({})
//     .populate({
//       path: 'createdBy',
//       model: 'User'
//     })
//     .exec((err, templates) => {
//       if (err) {
//         console.log('pending_requests error_fetching requests database_error', err);
//         return res.send('Error Fetching Templates From the Database!! Refresh the Page or Contact IT for help.');
//       }
//       return res.render('edit_views/edit_table', {
//         request,
//         alertMsg,
//         templates,
//         user: req.user
//       });
//     });
// });

router.get('/edit_templates', (req, res, next) => {
  const page = (parseInt(req.query.page, 10) || 1) || 1; // set to 0 if page is NaN
  const { search } = req.query;

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
    let last = parseInt(count / DOCS_PER_PAGE, 10);
    if (count % DOCS_PER_PAGE !== 0) {
      last += 1;
    }
    return Template.find(searchObj)
      .sort({ name: 'ascending' })
      .limit(DOCS_PER_PAGE)
      .skip((page - 1) * DOCS_PER_PAGE)
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
          if (x.subject.length > MAX_LENGTH) {
            x.subject = `${x.subject.substring(0, MAX_LENGTH)} ...`;
          }

          if (x.name.length > MAX_LENGTH) {
            x.name = `${x.name.substring(0, MAX_LENGTH)} ...`;
          }

          return x;
        });
        const startIndex = ((page - 1) * DOCS_PER_PAGE) + 1;
        let [noTemplates, noResults] = [false, false];
        if (!search && page === 1 && templates.length === 0) {
          noTemplates = true;
        }
        if (page === 1 && templates.length === 0) {
          noResults = true;
        }
        return res.render('edit_views/edit_table', {
          templates,
          startIndex,
          noTemplates,
          noResults,
          search,
          page,
          last,
          threeBeforeLast: (last - 3) < page ? page : (last - 3),
          user: req.user,
          endpoint: '/edit_templates?',
          new_endpoint: '/new_template'
        });
      });
  });
});

router.get('/new_template', (req, res) => {
  const messages = { missing_fields: 'One or more fields are missing. Please complete the form before submitting.' };
  const { request } = req.query;
  let alertMsg;
  if (request) {
    alertMsg = messages[req.query.type];
  }
  return res.render('edit_views/template/new_template', { user: req.user, request, alertMsg });
});

router.post('/new_template', (req, res) => {
  const { title, subject, body } = req.body;
  const createdBy = req.user._id;
  if (!title || !subject || !body) {
    return res.redirect(`/new_template?request=failure&type=missing_fields&title=${title}&subject=${subject}&body=${body}`);
  }
  const newTemplate = new Template({
    title,
    subject,
    body,
    createdBy
  });

  return newTemplate.save((err, template) => {
    if (err) {
      console.log('new_template save datbase_error');
      return res.redirect('/edit_templates?request=failure&type=database');
    }
    Log.log('Created', req.user._id, 'New Template Created', 'Template', 'post new_template database_error', null, null, template._id, null, title);
    return res.redirect('/edit_templates?request=success&type=created');
  });
});

router.get('/edit_template', (req, res) => {
  const messages = { missing_fields: 'One or more fields are missing. Please complete the form before submitting' };
  const { request } = req.query;
  let alertMsg;
  if (request) {
    alertMsg = messages[req.query.type];
  }
  const templateId = req.query.template;
  Template.findById(templateId, (err, template) => {
    if (err) {
      console.log('edit_template template_lookup database_error');
      return res.redirect('/edit_templates', 'request=failure&type=database');
    }
    if (!template) {
      return res.redirect('/edit_templates?request=failure&type=not_found');
    }
    return res.render('edit_views/template/edit_template', { user: req.user, template, request, alertMsg });
  });
});

router.post('/edit_template', (req, res) => {
  const { title, subject, body } = req.body;
  const templateId = req.query.template;

  if (!title || !subject || !body) {
    return res.redirect(`/edit_template?template=${templateId}&request=failure&type=missing_fields`);
  }

  return Template.findByIdAndUpdate(templateId, {
    title,
    subject,
    body
  }, (err, template) => {
    if (err) {
      console.log('edit_template post_edit database_error');
      return res.redirect('/edit_templates?request=failed');
    }
    let logTitle = '';
    if (title !== template.title) {
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
    if (logTitle === '') {
      return res.redirect('/edit_templates?request=success&type=updated');
    }
    Log.log('Edited', req.user._id, logTitle, 'Template', 'post edit_template database_error', null, null, template._id, null, title);
    return res.redirect('/edit_templates?request=success&type=updated');
  });
});

router.put('/delete_template', (req, res) => {
  const { templateId, templateTitle } = req.body;
  Template.deleteOne({ _id: templateId }, (err) => {
    if (err) {
      console.log('put delete_template database_error');
    } else {
      // make a log
      Log.log('Deleted', req.user._id, 'Template Deleted', 'Template', 'put delete_template database_error', null, null, null, null, templateTitle);
      res.send('Template Deleted Successfully');
    }
  });
});

module.exports = router;
