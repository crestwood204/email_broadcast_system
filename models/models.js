/* eslint no-use-before-define: ["error", { "variables": false }] */
const mongoose = require('mongoose');

const { Schema } = mongoose;

const RequestSchema = new Schema({
  to: {
    type: [String],
    required: true
  },
  from: {
    type: Schema.ObjectId,
    ref: 'User'
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
  }
});

const UserSchema = new Schema({
  username: {
    type: String,
    required: true
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
  request_id: {
    type: Schema.ObjectId,
    ref: 'Request'
  },
  edit_user_id: {
    type: Schema.ObjectId,
    ref: 'User'
  },
  template_id: {
    type: Schema.ObjectId,
    ref: 'Template'
  },
  group_id: {
    type: Schema.ObjectId,
    ref: 'Group'
  },
  template_title: String
});

LogSchema.statics.log = (
  change,
  userId,
  description,
  type,
  errMsg,
  requestId,
  editUserId,
  templateId,
  groupId,
  templateTitle
) => {
  const newLog = new Log({
    change,
    user_id: userId,
    description,
    type,
    date: new Date()
  });

  if (requestId) {
    newLog.request_id = requestId;
  } else if (editUserId) {
    newLog.edit_user_id = editUserId;
  } else if (templateId) {
    newLog.template_id = templateId;
  } else if (groupId) {
    newLog.group_id = groupId;
  }

  if (templateTitle) {
    newLog.template_title = templateTitle;
  }

  newLog.save((err) => {
    if (err) {
      console.log(errMsg);
    }
  });
};

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
  }
});

const TemplateSchema = new Schema({
  title: {
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

const Request = mongoose.model('Request', RequestSchema);
const User = mongoose.model('User', UserSchema);
const Log = mongoose.model('Log', LogSchema);
const Group = mongoose.model('Group', GroupSchema);
const Template = mongoose.model('Template', TemplateSchema);

module.exports = { Request, User, Log, Group, Template };
