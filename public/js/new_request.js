/* global bootstrapSelectSetup  */
$(document).ready(() => {
  /*
   * Function Runs as soon as document loads
   * Slower User Load at start, but access to all templates during use of application
   */
  (function retrieveTemplates() {
    $.ajax({
      url: '/get_templates',
      method: 'get',
      error(err) {
        // Error Retrieving Template
        console.log('Error:', err);
        $('#error_msg').removeAttr('style');
      },
      success(res) {
        // on success, save templates to session storage
        const parsedRes = JSON.parse(res);
        for (let i = 0; i < parsedRes.length; i += 1) {
          sessionStorage.setItem(parsedRes[i].title, JSON.stringify(parsedRes[i]));
        }
      }
    });

    // let to = $('#toSelect').text();
    // if (/,+/.test(to)) {
    //   to = to.split(',').map(x => x.trim());
    // } else {
    //   to = [to];
    // }
    // $('#toField').val(to);
  }());

  $('#templateField').on('change', function templateFieldChange() {
    let template = $(this).val();
    if (template !== 'Choose...') {
      template = JSON.parse(sessionStorage.getItem(template));
      $('#subject').val(template.subject);
      $('#body').val(template.body);
    }
  });

  $('.thumbnail').on('change', function thumbnailChange() {
    const number = parseInt($(this).attr('id').split('-')[1], 10) + 1;
    if (number <= 7) {
      $(`#thumbnail-${number}`).attr('type', 'file');
      $(`#thumbnail-${number}`).parent().addClass('files');
      $(`#thumbnail-${number}`).parent().removeClass('hidden');
    }
  });
  (function setupMultiSelects() {
    const ids = ['toField', 'locationField'];
    bootstrapSelectSetup(ids);
  }());
});
