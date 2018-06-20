const ar = require('./auth');
const br = require('./broadcast_routes');
const apr = require('./approver_routes');
const ur = require('./edit_routes/user_routes');
const gr = require('./edit_routes/group_routes');
const tr = require('./edit_routes/template_routes');
const st = require('./edit_routes/settings');

module.exports = {
  AUTH_ROUTES: ar,
  BROADCAST_ROUTES: br,
  APPROVER_ROUTES: apr,
  USER_ROUTES: ur,
  GROUP_ROUTES: gr,
  TEMPLATE_ROUTES: tr,
  SETTINGS: st
};
