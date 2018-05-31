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
  edit_user_id: {
    type: Schema.ObjectId,
    ref: 'User'
  }
})

LogSchema.statics.log = function(change, user_id, description, type, err_msg, request_id, edit_user_id) {
  var new_log = undefined

  if (request_id) {
    new_log = new Log({
      change: change,
      user_id: user_id,
      description: description,
      type: type,
      request_id: request_id,
      date: new Date()
    })
  } else {
    new_log = new Log({
      change: change,
      user_id: user_id,
      description: description,
      type: type,
      edit_user_id: edit_user_id,
      date: new Date()
    })
  }


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
