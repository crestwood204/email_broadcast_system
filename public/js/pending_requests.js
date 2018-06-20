$(document).ready(() => {
  const acceptReject = function acceptReject(that, event, id, decision) {
    event.preventDefault();
    $.ajax({
      url: '/decide_request',
      method: 'post',
      data: {
        id,
        decision
      },
      error(err) {
        console.log('error communicating with server', err);
      },
      success() {
      }
    });
  };

  /*
   * Handles submit for approving request
   * Repeated calls are disabled on the server, so it is safe to click multiple times
   */
  $('.accept-btn').on('click', function acceptButtonClick(event) {
    const id = $(this).attr('id').substring(7);

    // send ajax request to server
    acceptReject(this, event, id, 'approve');

    // hide the button
    $(this).hide();
    $(`#reject-${id}`).hide();

    // add accepted symbol
    $(`#decision-${id}`).append('<btn class="no-highlight no-hover-green btn-sm btn-success">Approved</btn>');
  });

  /*
   * Handles submit for rejecting request
   * Repeated calls are disabled on the server, so it is safe to click multiple times
   */
  $('.reject-btn').on('click', function rejectButtonClick(event) {
    const id = $(this).attr('id').substring(7);

    // send ajax request to server
    acceptReject(this, event, id, 'reject');

    // hide the button
    $(this).hide();
    $(`#accept-${id}`).hide();

    // add rejected symbol
    $(`#decision-${id}`).append('<btn class="no-highlight no-hover-red btn-sm btn-danger">Rejected</btn>');
  });
});
