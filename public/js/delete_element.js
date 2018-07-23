$(document).ready(() => {
  $('.trash').on('click', function deleteElement(event) {
    event.preventDefault();
    const id = $(this).attr('id').split('-')[2];
    const url = `/delete_${$('#type').text().trim()}`;
    const name = $(this).attr('name');
    $.ajax({
      url,
      method: 'PUT',
      data: {
        id,
        name
      },
      error(err) {
        console.log('error communicating with server', err);
      },
      success() {
        const endpoint = $('#search-bar-form').attr('action');
        window.location.href = `${endpoint}status=deleted`;
      }
    });
  });
});
