$(document).ready(function() {
  $('.trash').on('click', function(event) {
    var id = $(this).attr('id').split('-')[2]
    $.ajax({
      url: '/delete_group',
      method: 'PUT',
      data: {
        'id': id,
        'group_name': $(this).attr('name')
      },
      error: function(err) {
        console.log('error communicating with server', err);
      },
      success: function(res) {
        window.location.href = "/edit_groups?request=success&type=deleted"
      }
    })
  })
})
