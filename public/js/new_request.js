$(document).ready(function() {
  $('#templateField').on('change', function(event) {
    var template = $(this).val()
    if (template !== 'Choose...') {
      // ajax request server for template

        // on success, populate subject and body
    }
  })
})
