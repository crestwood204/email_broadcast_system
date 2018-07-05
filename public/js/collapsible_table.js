$(document).ready(() => {
  const buttonDict = {};
  $('.clickable-row').on('click', function toggleCollapse() {
    const id = $(this).attr('data-target');
    if (buttonDict.id) {
      return;
    }
    if ($(id).hasClass('show')) {
      $(id).parent().addClass('blank-row');
      $(id).parent().siblings(0).addClass('blank-row');
      buttonDict.id = true;
      setTimeout(() => { buttonDict.id = false; }, 400);
    } else {
      $(id).parent().removeClass('blank-row');
      $(id).parent().siblings(0).removeClass('blank-row');
    }
  });
});
