var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var RequestSchema = new Schema ({
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
  active: {
    type: Boolean,
    default: true,
    required: true
  }
})

var LogSchema = new Schema ({
  request_id: {
    type: Schema.ObjectId,
    ref: 'Request'
  },
  type: {
    type: String,
    required: true
  },
  user_id: {
    type: Schema.ObjectId,
    ref: 'User'
  },
  title: {
    type: String,
    required: true
  },
  obj_type: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  }
})

LogSchema.statics.makeLog = function(type, user_id, title, obj_type, err_msg, request_id) {
  var new_log = new Log({
    type: type,
    user_id: user_id,
    title: title,
    obj_type: obj_type,
    request_id: request_id,
    date: new Date()
  })

  new_log.save(function(err, log) {
    if (err) {
      console.log(err_msg)
    }
  })
}

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
