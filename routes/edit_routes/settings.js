const express = require('express');
const Models = require('../../models/models');
const multer = require('multer'); // npm package for file uploads
const Constants = require('../../models/constants');
const EmailHelpers = require('../../helpers/email_helpers');
const Messages = require('../../models/message_constants');

const { sendApproverEmail, rmDir } = EmailHelpers;
const { MAX_FILE_SIZE } = Constants;
const { User, Request } = Models;
const router = express.Router();

let upload = multer();

// configure settings for file upload
const uploadStorage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, './public/user_data/signatures');
  },
  filename(req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}-${file.originalname}`);
  }
});

router.get('/user_settings', (req, res, next) => {
  const [error, status] = [Messages[req.query.error], Messages[req.query.status]];
  const userId = req.user._id;
  User.findById(userId).then(
    (profile) => {
      res.render('user_settings', {
        user: req.user,
        profile,
        modal: { title: 'Delete Signature', text: 'Are you sure you want to delete this signature?', type: 'Delete' },
        endpoint: { endpoint: 'user_settings' },
        error,
        status
      });
    },
    (err) => {
      console.log('settings user_query database_error', err);
      return next(err);
    }
  );
});

const updateSignature = function updateSignature(req, res, next, file, deletion) {
  if (req.user.signature && Object.prototype.hasOwnProperty.call(req.user.signature, 'path')) {
    rmDir('./public/user_data/signatures', [req.user.signature]);
  }
  return User.findByIdAndUpdate(req.user._id, {
    $set: {
      signature: file,
      signatureLastUpdated: new Date()
    }
  })
    // check if any request has this signature, if so, update them
    .then(
      () => Request.find({ pending: true }).then(
        (requests) => {
          const signature = `.~${req.user.username}`;
          for (let i = 0; i < requests.length; i += 1) {
            if (requests[i].body.includes(signature)) {
              // send approval email
              Request.update(
                { _id: requests[i]._id }, { $set: { lastUpdated: new Date() } },
                (updateErr) => {
                  if (updateErr) {
                    return console.log('database error', updateErr);
                  }
                  return sendApproverEmail(requests[i], req.user.email, true)
                    .catch((approverEmailErr) => {
                      console.log('approver email error', approverEmailErr);
                    });
                }
              );
            }
          }
          if (deletion) {
            res.status(200).send('success');
          } else {
            res.redirect('/user_settings');
          }
        },
        requestsErr => next(requestsErr)
      ),
      userErr => next(userErr)
    )
    .catch(promiseErr => next(promiseErr));
};


router.post('/user_settings', (req, res, next) => {
  upload = multer({
    storage: uploadStorage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter(request, file, callback) {
      if (file.mimetype !== 'image/png' && file.mimetype !== 'image/jpeg') {
        return callback(new Error('extension'));
      }
      return callback(null, true);
    }
  }).single('fileUpload');
  upload(req, res, (err) => {
    if (err) {
      // TODO: format error message
      console.log('err:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.redirect('/user_settings?error=limit_file_size');
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.redirect('/user_settings?error=limit_unexpected_file');
      }
      if (err.message === 'extension') {
        return res.redirect('/user_settings?error=file_extension');
      }
      return res.status(400).send({ redirect: '/404' });
    }

    if (!req.file) {
      return res.redirect('/user_settings');
    }

    return updateSignature(req, res, next, req.file);
  });
});

router.put('/delete_signature', (req, res, next) => {
  updateSignature(req, res, next, {}, true);
});
module.exports = router;
