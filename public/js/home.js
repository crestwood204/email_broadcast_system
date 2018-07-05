$(document).ready(() => {
  $('.clickable-row').on('dblclick', function openBroadcast() {
    window.location.href = `${$(this).attr('data-href')}`;
  });
});
