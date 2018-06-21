/* global getParamterByName */

$(document).ready(() => {
  $('#inputTitle').val(getParamterByName('title'));
  $('#inputSubject').val(getParamterByName('subject'));
  $('#body').val(getParamterByName('body'));
});
