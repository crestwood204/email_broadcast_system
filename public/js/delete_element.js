$(document).ready(() => {
  $('.trash').on('click', function deleteElement(event) {
    event.preventDefault();
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
        const endpoint = $('#search-bar-form').attr('action') || '/user_settings?';
        window.location.href = `${endpoint}status=deleted`;
      }
    });
  });
});
