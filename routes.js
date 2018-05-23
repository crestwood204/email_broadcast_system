//REQUIRE IN EXPRESS AND EXPRESS ROUTER TO CREATE ROUTES TO REQUIRE IN APP.JS
var express = require('express');
var router = express.Router();

//REQUIRE IN MODELS
var Models = require('./models/models');
var User = Models.User;

// load login page
router.get('/login', function(req, res) {
    res.render('login')
})

// handles user login, redirecting based on user type
router.post('/login_post', function(req, res) {
  console.log(received)
  var payload = JSON.parse(req.body.payload)
  var username = payload.username
  var password = payload.password

  User.findOne({username: username, password: password}).then(
    (user) => {
      if (user.approver) {
        res.redirect('approver') // TODO: should be sending user submissions through
      } else {
        res.redirect('submitter')
      }
    },
    (err) => {
      res.status(400).send('unauthorized')
    }
  )
})

router.post('/message', function (req, res, next) {
  //RETRIEVE SLACKID FROM THE BODY OF THE POST REQUEST
  var slackId = JSON.parse(req.body.payload).callback_id;

  //IF THE USER CLICKED NO AKA. THEY WANT TO CANCEL A REQUEST
  if (JSON.parse(req.body.payload).actions[0].value === 'bad') {
    console.log('here3', JSON.parse(req.body.payload).actions[0].value);
    //RESPOND TO THE POST REQUEST AND DM THE USER
    res.send('Okay I canceled your request!');

    //FIND THE USER AND CLEAR THEIR PENDING REQUEST
    User.findOne({slackId: slackId})
    .then(user => {
      user.pendingRequest = '';
      user.save()
    })
  }

  //IF THE USER CLICKED YES TO THE INTERACTIVE MESSAGE AKA. THEY WANT
  //YOU TO SCHEDULE THE EVENT, CALL THE ADDTOGOOGLE HELPER FUNCTION TO
  //ADD THE EVENT TO THEIR GOOGLE CALENDAR
  else if (JSON.parse(req.body.payload).actions[0].value === 'good') {
    // HELPER FUNCTION TAKES IN 4 ARGUMENTS HERE
    // THE USER WHO SENT THE MESSAGE'S SLACKID
    // RES SO THE HELPER CAN CALL RES.SEND WITH THE CORRECT MESSAGE
    // WEB AND RTM SO WE CAN SEND MESSAGES

    addToGoogle(slackId, res, web, rtm);
  } else {
    //THIS CASE WILL BE CALLED WHEN A USER IS CHOOSING AN ALTERNATE DATE
    //POST CONFLICT
    //EXTRACT THE DATE FROM THE BODY OF THE INTERACTIVE MESSAGE HERE
    var date = JSON.parse(req.body.payload).actions[0].value;

    //CALL ADD TO GOOGLE WITH AN ADDITIONAL ARGUMENT DATE THAT IS THE
    //NEW DATE
    addToGoogle(slackId, res, web, rtm, date);
  }

});


//ROUTE IS HIT WHEN SOMEONE CLICKS AUTHORIZE GOOGLE CALENDAR
router.get('/connect/callback', function(req, res) {
  //GOOGLE TAGS ON TWO QUERIES: CODE AND STATE
  //CODE: CONTAINS A KEY THAT ALLOWS US TO GET THE USER TOKENS
  //STATE: CONTAINS THE USER'S SLACKID
  var code = req.query.code;
  var state = req.query.state;

  //SET UP GOOGLE AUTHORIZATION TO ALLOW US TO INTERFACE WITH GOOGLE
  //CREATES AN OBJECT THAT WE CAN ADD USER CREDENTIALS TO
  //WE NEED A NEW INSTANCE OF THIS OBJECT FOR EACH USER
  var googleAuthorization = getGoogleAuth();

  //TURNS CODE INTO A TOKEN FOR THE USER
  googleAuthorization.getToken(code, function(err, tokens) {
    if (err) {
      res.send('Error', err);
    } else {
      //SETS THE CREDENTIALS OF THE GOOGLEAUTH OBJECT WITH CURRENT USER'S TOKENS
      googleAuthorization.setCredentials(tokens);

      //GOOGLE PLUS PART
      var plus = google.plus('v1');
      //PASS IN AUTH OBJECT TO REQUEST THE USER'S GOOGLE PLUS INFORMATION
      plus.people.get({auth: googleAuthorization, userId: 'me'}, function(err, googleUser) {
        //USE THE SLACKID STORED IN GOOGLE'S STATE QUERY TO FIND USER BY SLACKID
        User.findById(JSON.parse(decodeURIComponent(state)).auth_id)
        .then(function(mongoUser) {
          //STORE THE USER'S GOOGLE TOKENS INTO THEIR MONGODB PROFILE
          mongoUser.google = tokens;
          //IF THEY ARE A GOOGLE PLUS USER ADD ON THE FOLLOWING ATTRIBUTES
          //TO THE THE GOOGLE OBJECT ON THEIR PROFILE
          if (googleUser) {
            mongoUser.google.profile_id = googleUser.Id
            mongoUser.google.profile_name = googleUser.displayName
            mongoUser.google.email = googleUser.emails[0].value;
          }
          //SAVE THIS USER TO MONGODB
          return mongoUser.save();
        })
        .then(function(mongoUser) {
          // ON SUCCESS REDIRECT TO /CONNECT/SUCCESS ROUTE
          res.redirect('/connect/success');
        })
      })
    }
  })
});

//SHOWS UP AFTER A NEW USER HAS AUTHORIZED ACCESS TO THEIR GOOGLE EMAIL
//REDIRECTED TO BY /CONNECT/CALLBACK ROUTE
router.get('/connect/success', function(req, res) {
    res.send('Connect success')
});


//IS A USER CHATS THE BOT AND HAS NOT GRANTED GOOGLE ACCESS WE SEND THEM
//A LINK THAT GOES TO THIS ROUTE
router.get('/connect', function(req, res) {
  //THE URL GRABS THE SLACK ID
  var userId = req.query.user;

  //SET UP GOOGLE AUTHORIZATION TO ALLOW US TO INTERFACE WITH GOOGLE
  //CREATES AN OBJECT THAT WE CAN ADD USER CREDENTIALS TO
  //WE NEED A NEW INSTANCE OF THIS OBJECT FOR EACH USER
  var googleAuthorization = getGoogleAuth();

  //CREATE A GOOGLE URL TO SEND THE USER TO SO THEY CAN GRANT ACCESS TO
  //THE USER'S CALENDAR
  var url = googleAuthorization.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    //THIS ASKS FOR THEIR PROFILE, CALENDAR, AND EMAIL
    scope: [
      'profile',
      'https://www.googleapis.com/auth/calendar',
      'email'
    ],
    //HOW YOU TELL GOOGLE TO PASS BACK THE USERID IN THE STATE QUERY
    state: encodeURIComponent(JSON.stringify({
      auth_id: userId
    }))
  });

  //GOOGLE GIVES US THIS URL TO REDIRECT TO
  res.redirect(url);
})

module.exports = router;
