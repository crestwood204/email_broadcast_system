var express = require('express')
var router = express.Router()

router.get('/edit_users', function(req, res) {
  console.log('hiya')
  if (req.user.approver) {
    res.render('edit_views/edit_users', {'approver': req.user.approver})
  }
})

router.get('/edit_groups', function(req, res) {
  if (req.user.approver) {
    res.render('edit_views/edit_groups', {'approver': req.user.approver})
  }
})

module.exports = router
