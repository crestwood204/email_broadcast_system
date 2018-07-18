$(document).ready(() => {
  const approveReject = function approveReject(that, event, id, decision) {
    event.preventDefault();
    const lastUpdated = $(that).attr('lastUpdated');
    $.ajax({
      url: '/decide_request',
      method: 'post',
      data: {
        id,
        decision,
        lastUpdated
      },
      error(err) {
        console.log('error communicating with server', err);
      },
      success(res) {
        if (res.error === 'updatedRequest') {
          window.location.href = `/pending_broadcast?requestId=${id}&error=lastUpdated`;
        }
      }
    });
  };

  /*
   * Handles submit for approving request
   * Repeated calls are disabled on the server, so it is safe to click multiple times
   */
  $('.approve-btn').on('click', function approveButtonClick(event) {
    const id = $(this).attr('id').substring(8);

    // send ajax request to server
    approveReject(this, event, id, 'approve');

    const parent = $(this).parent();

    // remove decision buttons and add approved symbol
    parent.empty();
    parent.append('<btn class="approve-button btn-sm btn-success">Approved</btn>');
  });

  /*
   * Handles submit for rejecting request
   * Repeated calls are disabled on the server, so it is safe to click multiple times
   */
  $('.reject-btn').on('click', function rejectButtonClick(event) {
    const id = $(this).attr('id').substring(7);

    // send ajax request to server
    approveReject(this, event, id, 'reject');

    const parent = $(this).parent();

    // remove decision buttons and add rejected symbol symbol
    parent.empty();
    $(parent).append('<btn class="reject-button btn-sm btn-danger">Rejected</btn>');
  });
});
