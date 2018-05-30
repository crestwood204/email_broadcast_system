$(document).ready(function() {
  var types = $('.to')
  for (var i = 0; i < types.length - 1; i++) {
    if ($(types[i]).text().trim().substring(6) === 'Broadcast Request') {
      $(types[i]).parent().siblings(0).find('.approved').hide()
    }
  }
})
