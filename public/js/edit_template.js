$(document).ready(function() {
    $('#delete_confirm').on('click', function(event) {
      event.preventDefault();
      var template_id = $(this).attr('_id')
      var template_title = $('#inputTitle').val()
      $.ajax({
        url: '/delete_template',
        method: 'PUT',
        data: {
          'template_id': template_id,
          'template_title': template_title
        },
        error: function(err) {
          console.log('error communicating with server', err);
        },
        success: function(res) {
          window.location.href = "/edit_templates?request=success&type=deleted"
        }
      })
    })
});
