var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var RequestSchema = new Schema ({
  to: {
    type: String,
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

var TaskSchema = new Schema ({
  subject: {
    type: String,
    required: true
  },
  day: {
    type: Date,
    required: true
  },
  eventId: {
    type: String
  },
  requesterId: {
    type: Schema.ObjectId,
    ref: 'User'
  }
});

// need to validate if the types of some of these fields are correct
var MeetingSchema = new Schema({
  day: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  invitees:{
    type: Array,
    required: true
  },
  googleCal: {},
  status: {
    type: String
  },
  createdAt: {
    type: Date
  },
  requesterId: {
    type: Schema.ObjectId,
    ref: 'User'
  },
  subject: {
    type: String
  }
});

var InviteRequestSchema = new Schema({
  eventId: {
    type: String
  },
  inviteeId: {
    type: String
  },
  requesterId: {
    type: String
  },
  status: {
    type: String
  }
})

var User = mongoose.model('User', UserSchema)
var Task = mongoose.model('Task', TaskSchema)
var Meeting = mongoose.model('Meeting', MeetingSchema)
var InviteRequest = mongoose.model('InviteRequest', InviteRequestSchema)

module.exports = {
  User: User,
  Task: Task,
  Meeting: Meeting,
  InviteRequest: InviteRequest
};
