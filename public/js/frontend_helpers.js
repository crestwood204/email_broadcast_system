/* eslint no-unused-vars: 1 */

/**
 * Retrieves value of query parameter
 * @param {string} name name of query parameter you want the value of.
 * @param {string} url Optional url. Defaults to current window url.
 * @returns {string} The value of the query paramater you are looking for.
 */
function getParameterByName(name, url) {
  const newUrl = url || window.location.href;
  const newName = name.replace(/[[]]/g, '\\$&');
  const regex = new RegExp(`[?&]${newName}(=([^&#]*)|&|#|$)`);
  const results = regex.exec(newUrl);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/**
 * Replaces Bootstrap 4.0 selects with a multiselect
 * @param {object} ids An array of ids to select using jQuery.
 * @returns {object} null.
 */
function bootstrapSelectSetup(ids) {
  // default plugin call
  ids.forEach((id) => {
    $(`#${id}`).attr('multiple', 'multiple');
    $(`#${id}`).multiselect({
      includeSelectAllOption: true,
      nonSelectedText: 'Choose...',
      enableFiltering: true
    });
  });

  // add carets
  $('.multiselect').append('<i class="top-right-caret caret fa fa-caret-up"></i>');
  $('.multiselect').append('<i class="bottom-right-caret caret fa fa-caret-down"></i>');
}
