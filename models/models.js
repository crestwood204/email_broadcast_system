/* eslint no-use-before-define: ["error", { "variables": false }] */
const mongoose = require('mongoose');

const { Schema } = mongoose;

const RequestSchema = new Schema({
  to: { // array of distribution group names
    type: [String],
    required: true
  },
  from: { // sender group name
    type: String,
    required: true
  },
  subject: { // request subject - user input
    type: String,
    required: true
  },
  body: { // request body - user input
    type: String,
    required: true
  },
  pending: { // whether or not a decision has been made about the request
    type: Boolean,
    default: true
  },
  approved: { // whether or not the decision made is approved or rejected
    type: Boolean,
    default: undefined
  },
  approver: { // name of approver that approved this request
    type: String,
    default: undefined
  },
  attachments: { type: [] }, // array of file attachments to send with the email
  dateApproved: { // the date on which the broadcast was approved/rejected
    type: Date,
    default: undefined
  },
  createdBy: { // the user object that this request was created by
    type: Schema.ObjectId,
    ref: 'User',
    required: true
  },
  dateCreated: { // the date that this request was created
    type: Date,
    default: undefined
  },
  lastUpdated: { // the date at which the request was last updated
    type: Date,
    default: undefined
  },
  username: { // the username of the user that created this request
    type: String,
    required: true
  }
});

const UserSchema = new Schema({
  username: { // the username of the user
    type: String,
    required: true,
    unique: true,
    dropDups: true
  },
  password: { // the password of the user
    type: String,
    required: true
  },
  approver: { // specifies whether or not the user is an approver
    type: Boolean,
    default: false
  },
  email: { // the email of the user
    type: String,
    required: true
  },
  active: { // specifies whether or not the user is activated, deactivated users cannot user the app
    type: Boolean,
    default: true,
    required: true
  },
  signature: { // An object that points to a file in public/user_data/signatures if uploaded
    type: Object,
    required: false
  },
  signatureLastUpdated: { // The date at which the signature was uploaded
    type: Date,
    required: false
  }
});

const LogSchema = new Schema({
  change: { // The type of action that is occuring: 'Created/Edited/Deleted/etc.'
    type: String,
    required: true
  },
  user_id: { // The user creating the request
    type: Schema.ObjectId,
    ref: 'User'
  },
  description: { // A description of the request
    type: String,
    required: true
  },
  type: { // The model being accessed resulting in a log: User, Request, Group, Template, etc.
    type: String,
    required: true
  },
  date: { // The date at which the log is created
    type: Date,
    required: true
  },
  requestId: { // optional request id associated with the log
    type: Schema.ObjectId,
    ref: 'Request'
  },
  editUserId: { // optional user id associated with the log - the user being edited
    type: Schema.ObjectId,
    ref: 'User'
  },
  templateId: { // optional template id associated with the log
    type: Schema.ObjectId,
    ref: 'Template'
  },
  groupId: { // optional group id associated with the log
    type: Schema.ObjectId,
    ref: 'Group'
  },
  templateName: String // the name of a group/template associated with the log
});

/*
 * A function for creating logs
 * options is an object with possible values of requestId, editUserId,
 *   templateId, groupId, and templateName
 * Refer to log model for more detailed description of each parameter
 */
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

  // if the log is referencing a request, then create a version of it
  // version control allows requests to be edited while being able to view each edit
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
  name: { // name of the group
    type: String,
    required: true,
    unique: true,
    dropDups: true
  },
  email: { // email that the broadcast system sends to/from
    type: String,
    required: true
  },
  type: { // specifies distibution/sender
    type: String,
    required: true
  }
});

const TemplateSchema = new Schema({
  name: { // name of template
    type: String,
    required: true
  },
  subject: { // subject of template
    type: String,
    required: true
  },
  body: { // body of template
    type: String,
    required: true
  },
  createdBy: { // user that created the template
    type: Schema.ObjectId,
    required: true
  }
});

/*
 * Version of a Request used for logging
 */
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
