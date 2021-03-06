$(document).ready(() => {
  (function setActiveTab() {
    const url = window.location.href.trim().split('?')[0].split('/');
    const endpoint = url[url.length - 1];
    if (endpoint === '') {
      $('#home_page').addClass('active');
      $('#pending_requests_page').removeClass('active');
      $('#log_page').removeClass('active');
      $('#dropdown_page').removeClass('active');
    } else if (endpoint === 'pending_requests') {
      $('#home_page').removeClass('active');
      $('#pending_requests_page').addClass('active');
      $('#log_page').removeClass('active');
      $('#dropdown_page').removeClass('active');
    } else if (endpoint === 'log') {
      $('#home_page').removeClass('active');
      $('#pending_requests_page').removeClass('active');
      $('#log_page').addClass('active');
      $('#dropdown_page').removeClass('active');
    } else {
      $('#home_page').removeClass('active');
      $('#pending_requests_page').removeClass('active');
      $('#log_page').removeClass('active');
      $('#dropdown_page').addClass('active');
    }
  }());
});
