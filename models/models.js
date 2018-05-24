var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var RequestSchema = new Schema ({
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
  }
})

var UserSchema = new Schema ({
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
  pendingRequests: {
    type: [Schema.ObjectId],
    ref: 'Request'
  }
})

var LogSchema = new Schema ({
  request_id: {
    type: [Schema.ObjectId],
    ref: 'Request'
  },
  type: {
    type: String,
    required: true
  }
})

var GroupSchema = new Schema ({
  name: {
    type: String,
    required: true
  },
  emails: {
    type: [String],
    required: true
  }
})

var Request = mongoose.model('Request', RequestSchema)
var User = mongoose.model('User', UserSchema)
var Log = mongoose.model('Log', LogSchema)
var Group = mongoose.model('Group', GroupSchema)

module.exports = {
  Request: Request,
  User: User,
  Log: Log,
  Group: Group
};
