/* global bootstrapSelectSetup  */
/* global customValidation  */
$(document).ready(() => {
  const MAX_FILE_SIZE = 250000;
  const fileStore = [];
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

    // sets to field to previous value on error
    let to = $('#toSelect').text();
    if (/,+/.test(to)) {
      to = to.split(',').map(x => x.trim());
    } else {
      to = [to];
    }
    $('#toField').val(to);

    // set locationField to choose...
    $('#locationField').val('');

    // set from field
    const from = $('#fromSelect').text() || '';
    $('#fromField').val(from).change();
  }());

  $('#templateField').on('change', function templateFieldChange() {
    let template = $(this).val();
    if (template !== 'Choose...') {
      template = JSON.parse(sessionStorage.getItem(template));
      $('#subject').val(template.subject);
      $('#body').val(template.body);
      if ($('.was-validated').length > 0) {
        customValidation();
      }
    }
  });

  $('.thumbnail').on('change', () => {
    // retrieve input object from storage
    const inputLength = fileStore.length;

    // get files
    const { files } = document.getElementById('thumbnail-1');
    // validate files
    const validatedFiles = [];
    for (let i = 0; i < files.length; i += 1) {
      // check if there are already 7 files
      if (!files[i] || 7 - inputLength - (i + 1) < 0) { // 1 index i
        break;
      }
      const split = files[i].name.split('.');
      const ext = split[1];
      // validate by extension and size
      if (files[i].size < MAX_FILE_SIZE) {
        if ((ext === 'docx' || ext === 'pdf') && split.length === 2) {
          validatedFiles.push(files[i]);
        } else {
          $('.alert').attr('style', 'display: none;');
          $('#error_msg-extension').removeAttr('style');
        }
      } else {
        $('.alert').attr('style', 'display: none;');
        $('#error_msg-size').removeAttr('style');
      }
    }

    // store the validated files in global object
    for (let i = 0; i < validatedFiles.length; i += 1) {
      fileStore.push(validatedFiles[i]);

      // create button objects for them
      $('#files').append(`
        <span class="file-upload" style="position: relative;">
          <span style="position: relative;">
            <i class="fa fa-file" style="font-size: 30px;"></i>
            <button id="filestore-${fileStore.length - 1}" type="button" class="close-btn">&#10006</button>
          </span>
          <span class="file-text">
            ${validatedFiles[i].name}
          </span>
        </span>`);
    }
  });

  // remove file from global file store and remove the span
  $('#files').on('click', '.close-btn', function removeFile() {
    const id = $(this).attr('id').split('-')[1];
    fileStore.slice(id, id);
    $(this).parent().parent().remove();
  });

  $('#new_request').on('click', (event) => {
    event.preventDefault();
    const data = new FormData();
    fileStore.forEach(file => data.append('files', file));
    data.append('to', $('#toField').val());
    data.append('location', $('#locationField').val());
    data.append('from', $('#fromField').val());
    data.append('subject', $('#subject').val());
    data.append('body', $('#body').val());

    // submit an ajax request
    $.ajax({
      url: '/new_request',
      method: 'POST',
      enctype: 'multipart/form-data',
      processData: false,
      contentType: false,
      cache: false,
      data,
      error(err) {
        // Error Retrieving Template
        console.log('Error:', err);
      },
      success(res) {
        window.location.href = res.redirect;
      }
    });
  });

  (function setupMultiSelects() {
    const ids = ['toField', 'locationField'];
    bootstrapSelectSetup(ids);
  }());
});
