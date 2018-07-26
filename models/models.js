/* eslint no-use-before-define: ["error", { "variables": false }] */
const mongoose = require('mongoose');

const { Schema } = mongoose;

const RequestSchema = new Schema({
  to: {
    type: [String],
    required: true
  },
  from: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  pending: {
    type: Boolean,
    default: true
  },
  approved: {
    type: Boolean,
    default: undefined
  },
  approver: {
    type: String,
    default: undefined
  },
  attachments: { type: [] },
  dateApproved: {
    type: Date,
    default: undefined
  },
  createdBy: {
    type: Schema.ObjectId,
    ref: 'User',
    required: true
  },
  dateCreated: {
    type: Date,
    default: undefined
  },
  lastUpdated: {
    type: Date,
    default: undefined
  },
  username: {
    type: String,
    required: true
  }
});

const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    dropDups: true
  },
  password: {
    type: String,
    required: true
  },
  approver: {
    type: Boolean,
    default: false
  },
  email: {
    type: String,
    required: true
  },
  active: {
    type: Boolean,
    default: true,
    required: true
  },
  signature: {
    type: Object,
    required: false
  },
  signatureLastUpdated: {
    type: Date,
    required: false
  }
});

const LogSchema = new Schema({
  change: {
    type: String,
    required: true
  },
  user_id: {
    type: Schema.ObjectId,
    ref: 'User'
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  requestId: {
    type: Schema.ObjectId,
    ref: 'Request'
  },
  editUserId: {
    type: Schema.ObjectId,
    ref: 'User'
  },
  templateId: {
    type: Schema.ObjectId,
    ref: 'Template'
  },
  groupId: {
    type: Schema.ObjectId,
    ref: 'Group'
  },
  templateName: String
});

LogSchema.statics.log = (
  change,
  userId,
  description,
  type,
  errMsg,
  options
) => {
  const newLog = new Log({
    change,
    user_id: userId,
    description,
    type,
    date: new Date()
  });

  // set optional log fields
  const keys = Object.keys(options);
  for (let i = 0; i < keys.length; i += 1) {
    newLog[keys[i]] = options[keys[i]];
  }

  if (Object.prototype.hasOwnProperty.call(options, 'requestId')) {
    Request.findById(options.requestId).then(
      (request) => {
        const requestVersion = new RequestVersion({
          to: request.to,
          from: request.from,
          subject: request.subject,
          body: request.body,
          approved: request.approved,
          approver: request.approver,
          createdBy: request.createdBy,
          username: request.username
        });

        requestVersion.save((versionSaveError, newRequestVersion) => {
          if (versionSaveError) {
            console.log('Error saving request version:', versionSaveError);
          }
          newLog.requestId = newRequestVersion;
          newLog.save((err) => {
            if (err) {
              console.log(errMsg);
            }
          });
        });
      },
      (versionError) => {
        if (versionError) {
          console.log('Error creating request version:', versionError);
        }
      }
    );
  } else {
    newLog.save((err) => {
      if (err) {
        console.log(errMsg);
      }
    });
  }
};

/*
 * Type: Distribution - Specifies that the group has an email of a distribution list
 *       Sender - Specifies that the email is a sender address
 *                - Just used to change the email address sent from
 */
const GroupSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    dropDups: true
  },
  email: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  }
});

const TemplateSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  createdBy: {
    type: Schema.ObjectId,
    required: true
  }
});

const RequestVersionSchema = new Schema({
  to: {
    type: [String],
    required: true
  },
  from: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  approved: {
    type: Boolean,
    default: undefined
  },
  approver: {
    type: String,
    default: undefined
  },
  createdBy: {
    type: Schema.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  }
});

const Request = mongoose.model('Request', RequestSchema);
const User = mongoose.model('User', UserSchema);
const Log = mongoose.model('Log', LogSchema);
const Group = mongoose.model('Group', GroupSchema);
const Template = mongoose.model('Template', TemplateSchema);
const RequestVersion = mongoose.model('RequestVersion', RequestVersionSchema);

module.exports = { Request, User, Log, Group, Template, RequestVersion };
