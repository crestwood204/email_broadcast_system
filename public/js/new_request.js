$(document).ready(function() {
  (function() {
    $.ajax({
      url: '/get_templates',
      method: 'get',
      error: function(err) {
        // Error Retrieving Template
        console.log('Error: ' + err)
        $('#error_msg').removeClass('display-none')
      },
      success: function(res) {
        // on success, save templates to session storage
        res = JSON.parse(res)
        for (var i = 0; i < res.length; i++) {
          sessionStorage.setItem(res[i].title, JSON.stringify(res[i]))
        }
      }
    })
  })()

  $('#templateField').on('change', function(event) {
    var template = $(this).val()
    if (template !== 'Choose...') {
      template = JSON.parse(sessionStorage.getItem(template))
      $('#subject').val(template.subject)
      $('#body').val(template.body)
    }
  })

  $('#new_request').on('click', function(event) {
    if ($(this).attr('clicked') === 'true') {
      event.preventDefault()
    }
    $(this).attr('clicked', 'true')
  })
})
