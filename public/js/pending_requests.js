$(document).ready(function() {
  $('.accept-btn').on('click', function(event) {
    // it is ok if this button is clicked multiple times as
    // repeated calls are disabled on the server
    accept_reject(this, 'approve')

    // hide the button
    $(this).hide()
    var id = $(this).attr('id').substring(7)
    $('#reject-' + id).hide()

    // add accepted symbol
    $('#decision-' + id).append(`<btn class="no-highlight btn-xs btn-success">Accepted</btn>`)
  })

  $('.reject-btn').on('click', function(event) {
    accept_reject(this, 'reject')

    // hide the button
    $(this).hide()
    var id = $(this).attr('id').substring(7)
    $('#accept-' + id).hide()

    // add rejected symbol
    $('#decision-' + id).append(`<btn class="no-highlight btn-xs btn-danger">Rejected</btn>`)
  })

  var accept_reject = function(that, decision) {
    event.preventDefault();
    var id = $(that).attr('id').substring(7)
    $.ajax({
      url: '/decide_request',
      method: 'post',
      data: {
        'id': id,
        'decision': decision
      },
      error: function(err) {
        console.log('error communicating with server', err);
      },
      success: function(res) {
      }
    })

  }
})
