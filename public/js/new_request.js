$(document).ready(function() {

  /*
   * Function Runs as soon as document loads
   * Slower User Load at start, but access to all templates during use of application
   */
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

    var to = $('#toSelect').text()
    if (/,+/.test(to)) {
      to = to.split(',').map(x => x.trim())
    } else {
      to = [to]
    }
    $('#toField').val(to)

  })()

  $('#templateField').on('change', function(event) {
    var template = $(this).val()
    if (template !== 'Choose...') {
      template = JSON.parse(sessionStorage.getItem(template))
      $('#subject').val(template.subject)
      $('#body').val(template.body)
    }
  })

  $('.thumbnail').on('change', function(event) {
    var number = parseInt($(this).attr('id').split('-')[1]) + 1
    if (number <= 7) {
      $('#thumbnail-' + number).attr('type', 'file')
      $('#thumbnail-' + number).parent().addClass('files')
      $('#thumbnail-' + number).parent().removeClass('hidden')
    }
  })
})
