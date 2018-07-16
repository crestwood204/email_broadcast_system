/* global bootstrapSelectSetup  */
/* global customValidation  */
/* global MediumEditor */
$(document).ready(() => {
  const MAX_FILE_SIZE = 250000;
  let submitted = false;
  const fileStore = [];
  let editor;

  const createFileObjects = (validatedFiles, attachments) => {
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
           ${attachments ? validatedFiles[i].originalname : validatedFiles[i].name}
         </span>
       </span>`);
    }
  };
  /*
   * Function validates given files and adds them to fileStore and DOM for submission
   */
  const validateFiles = (files) => {
    // retrieve input object from storage
    const inputLength = fileStore.length;

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
    createFileObjects(validatedFiles);
  };
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
          sessionStorage.setItem(parsedRes[i].name, JSON.stringify(parsedRes[i]));
        }
      }
    });

    // set from field
    const from = $('#fromSelect').text() || '';
    $('#fromField').val(from).change();

    // set attachments
    const attachments = $('#attachments').text();
    if (attachments) {
      createFileObjects(JSON.parse(attachments), true);
    }

    // instantiate editable body
    editor = new MediumEditor('.editable', {
      buttonLabels: 'fontawesome',
      toolbar: { buttons: ['indent', 'outdent', 'bold', 'italic', 'underline', 'justifyLeft', 'justifyCenter', 'justifyRight', 'h2', 'h3', 'quote', 'removeFormat'] },
      placeholder: { text: '' },
      paste: {
        cleanPastedHTML: true,
        forcePlainText: true,
        cleanReplacements: [[/<!--[^>]*-->/gi, '']],
        cleanAttrs: ['class', 'dir', 'style'],
        cleanTags: ['label', 'meta', 'aside', 'span']
      }
    });
  }());

  $('#templateField').on('change', function templateFieldChange() {
    let template = $(this).val();
    if (template && template !== 'Choose...') {
      template = JSON.parse(sessionStorage.getItem(template));
      $('#subject').val(template.subject);
      if ($('.was-validated').length > 0) {
        customValidation();
      }
      editor.destroy();
      $('#body').val(template.body);
      editor.setup();
    }
  });

  // dynamically add

  $('.thumbnail').on('change', () => {
    // get files
    const { files } = document.getElementById('thumbnail-1');
    validateFiles(files);
  });

  // remove file from global file store and remove the span
  $('#files').on('click', '.close-btn', function removeFile() {
    const id = $(this).attr('id').split('-')[1];
    fileStore.slice(id, 1);
    $(this).parent().parent().remove();
  });

  $('#new_request').on('click', (event) => {
    event.preventDefault();
    const form = $('.needs-validation')[0];
    if (form.checkValidity() !== false && submitted === false) {
      submitted = true;
      const data = new FormData();
      // if file is uploaded by user then store it in files
      // if file is uploaded by server then store it in attachments
      const attachments = [];
      fileStore.forEach(file => (Object.prototype.hasOwnProperty.call(file, 'originalname') ? attachments.push(file) : data.append('files', file)));
      data.append('to', $('#toField').val());
      data.append('location', $('#locationField').val());
      data.append('from', $('#fromField').val());
      data.append('subject', $('#subject').val());
      data.append('body', $('#body').val());
      data.append('attachments', JSON.stringify(attachments));
      const id = $('#modify').attr('_id');
      if (id) {
        data.append('id', id);
      }

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
    }
    form.classList.add('was-validated');

    // add validators for custom elements
    customValidation();
  });

  (function setupMultiSelects() {
    const ids = ['toField', 'locationField'];
    bootstrapSelectSetup(ids);

    // sets to field to previous value on error
    const toText = $('#toSelect').text();

    // set value of multiselect to nothing
    $('#toField').val('');

    // remove button text
    $('.multiselect').first().attr('title', 'Choose...');
    $('.multiselect-selected-text').first().text('Choose...');

    // uncheck all check boxes
    $('.checkbox').each((index, el) => {
      $(el).children().first().prop('checked', false);
    });

    if (toText) {
      // set value of multiselect
      const to = toText.split(',').map(x => x.trim());
      $('#toField').val(to);

      // set button text
      $('.multiselect').first().attr('title', toText);
      $('.multiselect-selected-text').first().text(toText);

      // check boxes
      $('.checkbox').each((index, el) => {
        if (to.includes($(el).prop('outerText').trim())) {
          $(el).children().first().prop('checked', true);
        }
      });
    }
  }());
});
