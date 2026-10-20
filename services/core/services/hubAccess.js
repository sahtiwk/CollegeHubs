const User = require('../models/User');
const Hub = require('../models/Hub');
const College = require('../models/College');
function accessError(status, code, message) { return Object.assign(new Error(message), { status, code }); }
async function currentMembership(principal) {
  const id = principal?._id || principal?.userId || principal?.sub;
  if (!id || !/^[a-f0-9]{24}$/i.test(String(id))) return null;
  const user = await User.findById(id);
  if (!user || !require('./membershipPolicy').hasMembershipAuthority(user)) return null;
  const hub = await Hub.findOne({ _id: user.hubId, hubId: user.hubId, status: 'active' });
  if (!hub || !(await College.exists({ _id: hub.collegeId, status: 'active' }))) return null;
  return { userId: String(user._id), hubId: String(hub._id), membershipVersion: user.membershipVersion };
}
async function getUserHubs(user) {
  const context = await currentMembership(user);
  return context ? [{ hubId: context.hubId, membershipVersion: context.membershipVersion }] : [];
}
async function requireHubAccess(principal, requestedHubId) {
  const context = await currentMembership(principal);
  if (!context) throw accessError(403, 'HUB_REQUIRED', 'An active college Hub is required');
  if (requestedHubId !== undefined && String(requestedHubId) !== context.hubId) throw accessError(403, 'HUB_FORBIDDEN', 'Access to this Hub is forbidden');
  return context;
}
async function requireTenant(req, res, next) {
  try { req.hub = await requireHubAccess(req.user); next(); }
  catch (err) { res.status(err.status || 503).json({ error: err.status ? err.message : 'Membership check unavailable', code: err.code || 'MEMBERSHIP_UNAVAILABLE' }); }
}
// Callers cannot replace this scope with request fields. Missing-hub objects never match.
function scopedFilter(context, filter = {}) {
  if (!context?.hubId || !/^[a-f0-9]{24}$/i.test(String(context.hubId))) throw accessError(403, 'HUB_REQUIRED', 'An authorized Hub context is required');
  return { ...filter, hubId: context.hubId };
}
module.exports = { getUserHubs, requireHubAccess, requireTenant, scopedFilter, accessError };
