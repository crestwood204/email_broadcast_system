$(document).ready(function() {
  (function() {
    var btns = $('.activate_confirm')
    for (var i = 0; i < btns.length; i++) {
      var btn_id = $(btns[i]).attr('id')
      var username = $('#username-' + btn_id).text()
      $('#activate_username-' + btn_id).text(username)
    }
  })()


  $('.activate_confirm').on('click', function(event) {
    event.preventDefault();
    var id = $(this).attr('id')
    $.ajax({
      url: '/activate_user',
      method: 'PUT',
      data: {
        'id': id
      },
      error: function(err) {
        console.log('error communicating with server', err);
      },
      success: function(res) {
        window.location.href = "/edit_users?activate=true"
      }
    })
  })
});
