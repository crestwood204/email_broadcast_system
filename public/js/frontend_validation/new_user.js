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
        const errorValidation = function errorValidation(selector, labelSelector) {
          selector.attr('style', 'border-color: #dc3545;');
          labelSelector.attr('style', 'display: block'); // adds the label
        };

        const successValidation = function successValidation(selector, labelSelector) {
          selector.attr('style', 'border-color: #28a745;');
          labelSelector.attr('style', 'display: none'); // hides the label
        };
        const password = $('#inputPassword').val();
        const confirmPassword = $('#inputConfirmPassword').val();

        if (password !== confirmPassword) {
          event.preventDefault();
          event.stopPropagation();

          const selector = $('#inputConfirmPassword');
          const selectorLabel = $('#confirmPasswordLabel');
          errorValidation(selector, selectorLabel);
          selector.bind('input propertychange', () => {
            if (selector.val() !== $('#inputPassword').val()) {
              errorValidation(selector, selectorLabel);
            } else {
              successValidation(selector, selectorLabel);
            }
          });
        }
        form.classList.add('was-validated');

        // add validators for custom elements
      }, false);
    });
  };

  // JavaScript for disabling form submissions if there are invalid fields
  (function disableSubmission() {
    window.addEventListener('load', () => {
      validate();
    }, false);
  }());
});
