$(document).ready(() => {
  $('.clickable-row').on('click', function openBroadcast() {
    window.location.href = `${$(this).attr('data-href')}`;
  });
});
