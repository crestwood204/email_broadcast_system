$(document).ready(function() {
    $('#delete_confirm').on('click', function(event) {
      event.preventDefault();
      var template_id = $(this).attr('_id')
      $.ajax({
        url: '/delete_template',
        method: 'PUT',
        data: {
          'template_id': template_id
        },
        error: function(err) {
          console.log('error communicating with server', err);
        },
        success: function(res) {
          window.location.href = "/edit_templates?request=delete"
        }
      })
    })
});
