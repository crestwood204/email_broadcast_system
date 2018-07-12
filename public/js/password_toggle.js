$(document).ready(() => {
  $('#show_hide_password a').on('click', (event) => {
    const input = $('#show_hide_password input');
    const i = $('#show_hide_password i');
    event.preventDefault();

    if (input.attr('type') === 'text') {
      input.attr('type', 'password');
      i.addClass('fa-eye-slash');
      i.removeClass('fa-eye');
    } else if (input.attr('type') === 'password') {
      input.attr('type', 'text');
      i.removeClass('fa-eye-slash');
      i.addClass('fa-eye');
    }
  });
});
