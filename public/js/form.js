/* eslint no-unused-vars: 1 */
/* global getParameterByName */
/*
 * Function is selecting attributes from a div defined on the .hbs file
 */
const customValidation = () => {
  const multiselectIds = $('#form-ids').attr('multiselect-ids').trim().split(' ');
  const multiselectFeedback = $('#form-ids').attr('multiselect-feedback').trim().split(' ');
  const noValidationIds = $('#form-ids').attr('select-novalidation-ids').trim().split(' ');
  const otherIds = $('#form-ids').attr('other').trim().split(' ');

  const errorValidation = function errorValidation(selector, labelSelector) {
    selector.attr('style', 'border-color: #dc3545;');
    labelSelector.attr('style', 'display: block'); // adds the label
  };

  const successValidation = function successValidation(selector, labelSelector) {
    selector.attr('style', 'border-color: #28a745;');
    labelSelector.attr('style', 'display: none'); // hides the label
  };

  const noValidation = function noValidation(selector) {
    selector.attr('style', 'border-color: #ced4da;');
  };

  // validates custom multiselect buttons
  multiselectIds.forEach((id, index) => {
    const button = $(`#${id}`).siblings().first().children()
      .first();

    if (button.attr('title') === 'Choose...') {
      errorValidation(button, $(`#${multiselectFeedback[index]}`));
    } else {
      successValidation(button, $(`#${multiselectFeedback[index]}`));
    }

    const searchBox = $(`#${id}`).siblings().first().children()
      .last()
      .children()
      .first()
      .children()
      .first()
      .children()
      .eq(1);

    // unvalidate the searchbox
    noValidation(searchBox);

    // add event listener to change the color once something is selected
    const validator = () => {
      if (button.children().first().text().trim() === 'Choose...') {
        errorValidation(button, $(`#${multiselectFeedback[index]}`));
      } else {
        successValidation(button, $(`#${multiselectFeedback[index]}`));
      }
    };

    // set time out because the field will check before it changes otherwise
    $('.checkbox').on('click', () => {
      setTimeout(validator, 100);
    });
    button.on('click', () => {
      validator();
    });
  });

  // removes validation from certain elements
  noValidationIds.forEach((id) => {
    noValidation($(`#${id}`));
  });

  // custom validation based on id
  otherIds.forEach((id) => {
    let selector;
    let feedbackSelector;
    if (id === 'body') {
      selector = $('#body');
      feedbackSelector = $('#bodyFeedback');
      if (selector.val() === '') {
        errorValidation(selector, feedbackSelector);
      } else {
        successValidation(selector, feedbackSelector);
      }

      // add event listener
      selector.bind('input propertychange', () => {
        if ($('#body').val() === '') {
          errorValidation($('#body'), $('#bodyFeedback'));
        } else {
          successValidation($('#body'), $('#bodyFeedback'));
        }
      });
    }
  });
};

$(document).ready(() => {
  const validate = function validate() {
    // Fetch all the forms we want to apply custom Bootstrap validation styles to
    const forms = document.getElementsByClassName('needs-validation');
    // Loop over them and prevent submission
    const validation = Array.prototype.filter.call(forms, (form) => {
      form.addEventListener('submit', (event) => {
        if (form.checkValidity() === false) {
          event.preventDefault();
          event.stopPropagation();
        }
        form.classList.add('was-validated');

        // add validators for custom elements
        customValidation();
      }, false);
    });
  };

  const runValidation = function runValidation() {
    const error = getParameterByName('error');
    if (error) {
      customValidation();
    }
  };

  // JavaScript for disabling form submissions if there are invalid fields
  (function disableSubmission() {
    window.addEventListener('load', () => {
      validate();
      runValidation();
    }, false);
  }());
});
