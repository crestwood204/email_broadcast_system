$(document).ready(function() {
  $('.accept-btn').on('click', function(event) {
    accept_reject(this, '/accept_pending_request')
  })

  $('.reject-btn').on('click', function(event) {
    accept_reject(this, '/reject_pending_request')
  })

  var accept_reject = function(that, url) {
    event.preventDefault();
    var id = $(that).attr('id').substring(7)
    $.ajax({
      url: url,
      method: 'put',
      data: {
        'id': id
      },
      error: function(err) {
        console.log('error communicating with server', err);
      },
      success: function(res) {
        // do nothing
      }
    })

  }
})
