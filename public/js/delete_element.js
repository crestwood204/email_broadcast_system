$(document).ready(() => {
  $('.trash').on('click', function deleteElement() {
    const id = $(this).attr('id').split('-')[2];
    const url = `delete_${$('#type')}`;
    $.ajax({
      url,
      method: 'PUT',
      data: {
        id,
        name: $(this).attr('name')
      },
      error(err) {
        console.log('error communicating with server', err);
      },
      success() {
        window.location.href = `/${$('#search-bar-form').attr('action')}?request=success&type=deleted`;
      }
    });
  });
});
