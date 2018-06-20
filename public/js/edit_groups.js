$(document).ready(() => {
  $('.trash').on('click', () => {
    const id = $(this).attr('id').split('-')[2];
    $.ajax({
      url: '/delete_group',
      method: 'PUT',
      data: {
        id,
        group_name: $(this).attr('name')
      },
      error(err) {
        console.log('error communicating with server', err);
      },
      success() {
        window.location.href = '/edit_groups?request=success&type=deleted';
      }
    });
  });
});
