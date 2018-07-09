/* global getParamterByName */
/* global customValidation */
// JavaScript for disabling form submissions if there are invalid fields

$(document).ready(() => {
  const validate = function validate() {
    // Fetch all the forms we want to apply custom Bootstrap validation styles to
    const forms = document.getElementsByClassName('needs-validation');
    // Loop over them and prevent submission
    Array.prototype.filter.call(forms, (form) => {
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
    const error = getParamterByName('error');
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
