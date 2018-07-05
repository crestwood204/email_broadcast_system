$(document).ready(() => {
  $('#search-btn').on('click', (event) => {
    event.preventDefault();
    // add front end validation like server-side for non [^a-zA-Z0-9] input
    window.location.href = `${$('#search-bar-form').attr('action')}search=${$('#search').val()}&page=1`;
  });
});
