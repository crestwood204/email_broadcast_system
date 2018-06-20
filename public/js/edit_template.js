$(document).ready(() => {
  $('#delete_confirm').on('click', function deleteConfirm(event) {
    event.preventDefault();
    const templateId = $(this).attr('_id');
    const templateTitle = $('#inputTitle').val();
    $.ajax({
      url: '/delete_template',
      method: 'PUT',
      data: {
        templateId,
        templateTitle
      },
      error(err) {
        console.log('error communicating with server', err);
      },
      success() {
        window.location.href = '/edit_templates?request=success&type=deleted';
      }
    });
  });
});
