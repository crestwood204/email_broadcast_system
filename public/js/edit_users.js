$(document).ready(() => {
  (function setUsernameForActivateButtons() {
    const btns = $('.activate_confirm');
    for (let i = 0; i < btns.length; i += 1) {
      const btnId = $(btns[i]).attr('id');
      const username = $(`#username-'${btnId}`).text();
      $(`#activate_username-${btnId}`).text(username);
    }
  }());


  $('.activate_confirm').on('click', function activateConfirm(event) {
    event.preventDefault();
    const id = $(this).attr('id');
    $.ajax({
      url: '/activate_user',
      method: 'PUT',
      data: { id },
      error(err) {
        console.log('error communicating with server', err);
      },
      success() {
        window.location.href = '/edit_users?request=success&type=activated';
      }
    });
  });

  $('.trash').on('click', function deleteElement() {
    const id = $(this).attr('id').split('-')[2];
    const url = 'deactivate_user';
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
        window.location.href = `${endpoint}status=deleted`;
      }
    });
  });
});
