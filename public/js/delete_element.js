$(document).ready(() => {
  $('.trash').on('click', (event) => {
    event.preventDefault();
    const url = `/delete_${$('#type').text().trim()}`;
    $.ajax({
      url,
      method: 'PUT',
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
