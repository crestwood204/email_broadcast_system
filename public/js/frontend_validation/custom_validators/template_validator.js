/* eslint no-unused-vars: 1 */

const customValidation = () => {
  const errorValidation = function errorValidation(selector, labelSelector) {
    selector.attr('style', 'border-color: #dc3545;');
    labelSelector.attr('style', 'display: block'); // adds the label
  };

  const successValidation = function successValidation(selector, labelSelector) {
    selector.attr('style', 'border-color: #28a745;');
    labelSelector.attr('style', 'display: none'); // hides the label
  };

  if ($('#body').val() === '') {
    errorValidation($('#body'), $('#bodyFeedback'));
  } else {
    successValidation($('#body'), $('#bodyFeedback'));
  }

  $('#body').bind('input propertychange', () => {
    if ($('#body').val() === '') {
      errorValidation($('#body'), $('#bodyFeedback'));
    } else {
      successValidation($('#body'), $('#bodyFeedback'));
    }
  });
};
