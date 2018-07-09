$(document).ready(() => {
  $('.trash').on('click', function deleteElement() {
    const id = $(this).attr('id').split('-')[2];
    const url = `/delete_${$('#type').text().trim()}`;
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
        const endpoint = $('#search-bar-form').attr('action');
        window.location.href = `${endpoint}request=success&type=deleted`;
      }
    });
  });
});
