/* eslint no-unused-vars: 1 */
$(document).ready(() => {
  const customValidation = () => {
    const multiselectIds = $('#form-ids').attr('multiselect-ids').trim().split(' ')
      .join('');
    const multiselectFeedback = $('#form-ids').attr('multiselect-feedback').trim().split(' ')
      .join('');
    const noValidationIds = $('#form-ids').attr('select-novalidation-ids').trim().split(' ')
      .join('');
    const otherIds = $('#form-ids').attr('other').trim().split(' ')
      .join('');

    multiselectIds.forEach((id) => {
      $(`#${id}`).siblings().first().children()
        .first()
        .attr('style', 'border-color: #dc3545;');
    });

    multiselectFeedback
    $('#toFeedback').attr('style', 'display: block');
  };


  // JavaScript for disabling form submissions if there are invalid fields
  (function disableSubmission() {
    window.addEventListener('load', () => {
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
    }, false);
  }());
});
