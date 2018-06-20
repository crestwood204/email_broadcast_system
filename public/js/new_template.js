const Helpers = require('../../helpers/helpers');

const { getParamterByName } = Helpers;

$(document).ready(() => {
  $('#inputTitle').val(getParamterByName('title'));
  $('#inputSubject').val(getParamterByName('subject'));
  $('#body').val(getParamterByName('body'));
});
