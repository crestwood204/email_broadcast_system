$(document).ready(function() {
  $('.toggle-row').on('click', function(event) {
    if ($($(this).attr('data-target')).hasClass('in')) {
        $($(this).attr('data-target')).parent().addClass('blank-row')
        $($(this).attr('data-target')).parent().siblings(0).addClass('blank-row')
    } else {
        $($(this).attr('data-target')).parent().removeClass('blank-row')
        $($(this).attr('data-target')).parent().siblings(0).removeClass('blank-row')
    }
  })
})
