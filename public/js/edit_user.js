$(document).ready(function() {
    $("#show_hide_password a").on('click', function(event) {
        event.preventDefault();
        if($('#show_hide_password input').attr("type") == "text"){
            $('#show_hide_password input').attr('type', 'password');
            $('#show_hide_password i').addClass( "fa-eye-slash" );
            $('#show_hide_password i').removeClass( "fa-eye" );
        }else if($('#show_hide_password input').attr("type") == "password"){
            $('#show_hide_password input').attr('type', 'text');
            $('#show_hide_password i').removeClass( "fa-eye-slash" );
            $('#show_hide_password i').addClass( "fa-eye" );
        }
    });

    (function() {
      var username = $('#inputUsername').val()
      $('#deactivate_username').text(username)
    })()

    $('#deactivate_confirm').on('click', function(event) {
      event.preventDefault();
      var username = $('#inputUsername').val()
      $.ajax({
        url: '/deactivate_user',
        method: 'PUT',
        data: {
          'username': username
        },
        error: function(err) {
          console.log('error communicating with server', err);
        },
        success: function(res) {
          window.location.href = "/edit_users?deactivate=true"
        }
      })
    })
});
