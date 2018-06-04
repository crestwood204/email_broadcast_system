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
  }
})

LogSchema.statics.log = function(change, user_id, description, type, err_msg, request_id, edit_user_id, template_id, group_id) {
  var new_log = new Log({
    change: change,
    user_id: user_id,
    description: description,
    type: type,
    date: new Date()
  })

  if (request_id) {
    new_log['request_id'] = request_id
  } else if (edit_user_id) {
    new_log['edit_user_id'] = edit_user_id
  } else if (template_id) {
    new_log['template_id'] = template_id
  } else if (group_id) {
    new_log['group_id'] = group_id
  } else {
    throw "Log Function Must Have A Schema.ObjectId"
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
  },
  location: {
    type: String,
    required: true
  }
})

var TemplateSchema = new Schema ({
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
})

var Request = mongoose.model('Request', RequestSchema)
var User = mongoose.model('User', UserSchema)
var Log = mongoose.model('Log', LogSchema)
var Group = mongoose.model('Group', GroupSchema)
var Template = mongoose.model('Template', TemplateSchema)

module.exports = {
  Request: Request,
  User: User,
  Log: Log,
  Group: Group,
  Template: Template
};
