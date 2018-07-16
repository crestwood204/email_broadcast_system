$(document).ready(() => {
  $('#modal-confirm').on('click', (event) => {
    event.preventDefault();
    $.ajax({
      url: '/delete_signature',
      method: 'PUT',
      error(err) {
        console.log('Error:', err);
      },
      success() {
        // window.location.href = '/user_settings';
      }
    });
  });
});
