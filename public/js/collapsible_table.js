/* eslint-env jquery */
$(document).ready(() => {
  $('.toggle-row').on('click', function toggleCollapse() {
    const id = $(this).attr('data-target');
    if ($(id).hasClass('show')) {
      $(id).parent().addClass('blank-row');
      $(id).parent().siblings(0).addClass('blank-row');
    } else {
      $(id).parent().removeClass('blank-row');
      $(id).parent().siblings(0).removeClass('blank-row');
    }
  });
});
