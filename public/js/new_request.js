$(document).ready(function() {
  var templates = []

  var setTemplate = function(template) {

  }

  $('#templateField').on('change', function(event) {
    var template = $(this).val()
    if (template !== 'Choose...') {
      var found = false
      for (t in templates) {
        if (t.title === 'template') {
          found = true
          setTemplate(t)
          break;
        }
      }
      if (!found) {
        // ajax request server for template
        var id = $(this).children(":selected").attr("id");
        $.ajax({
          url: '/get_template',
          method: 'get',
          data: {
            'template_id': id
          },
          error: function(err) {
            // Error Retrieving Template
            console.log('Error: ' + err)
            $('#error_msg').removeClass('display-none')
          },
          success: function(res) {
            // on success, populate subject and body
            console.log(res)
          }
        })
      }
    }
  })
})
