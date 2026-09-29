const mongoose = require('mongoose');
const College = require('../models/College');
const Hub = require('../models/Hub');
const Channel = require('../models/Channel');
const User = require('../models/User');
const { config, emailDomain, safeTheme } = require('../config/collegeRegistry');

async function transaction(work, connection = mongoose.connection) {
  // Concurrent first registrations can collide on unique upsert keys. Retry the entire transaction.
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await connection.transaction(work); }
    catch (err) { if (err.code !== 11000 || attempt === 2) throw err; }
  }
}
async function ensureHubForCollege(collegeId, session, connection = mongoose.connection) {
  if (!session) return transaction(activeSession => ensureHubForCollege(collegeId, activeSession, connection), connection);
  const CollegeModel = connection.model('College', College.schema);
  const HubModel = connection.model('Hub', Hub.schema);
  const ChannelModel = connection.model('Channel', Channel.schema);
  const college = await CollegeModel.findOne({ _id: collegeId, status: 'active' }).session(session);
  if (!college) throw new Error('Active college required');
  await college.validate();
  const id = new mongoose.Types.ObjectId();
  const hub = await HubModel.findOneAndUpdate({ collegeId: college._id }, { $setOnInsert: {
    _id: id, hubId: id, collegeId: college._id, slug: college.slug, name: college.name,
    verifiedEmailDomains: college.domains.map(item => item.normalizedDomain),
    themeTokens: safeTheme(college.themeTokens), themeVersion: college.themeVersion,
    timezone: college.timezone, defaultChannelSet: college.defaultChannels.map(item => item.slug),
    provisionVersion: college.configVersion, status: 'active',
  } }, { upsert: true, new: true, session, runValidators: true, setDefaultsOnInsert: false });
  if (hub.status !== 'active') throw new Error('Hub is disabled');
  for (const channel of college.defaultChannels) {
    await ChannelModel.updateOne({ hubId: hub._id, slug: channel.slug }, { $setOnInsert: {
      hubId: hub._id, slug: channel.slug, title: channel.title, kind: channel.kind,
      nextMessageSeq: 0, defaultSetVersion: college.configVersion, archivedAt: null,
    } }, { upsert: true, session, runValidators: true });
  }
  return hub;
}
async function assignMembership(userId) {
  return transaction(async session => {
    const user = await User.findById(userId).select('+googleSubject +emailVerifiedAt').session(session);
    if (!user) throw new Error('User no longer exists');
    // No self-service transfer or reactivation. Assigned/disabled users retain their current identity.
    if (user.hubId || user.membershipStatus === 'disabled') return user;
    const college = await College.findOne({ status: 'active', 'domains.normalizedDomain': emailDomain(user.email) }).session(session);
    if (!college) return user;
    const hub = await ensureHubForCollege(college._id, session);
    user.hubId = hub._id;
    user.college = college.name;
    user.membershipStatus = 'active';
    user.membershipVerified = Boolean(user.googleSubject && user.emailVerifiedAt);
    user.verificationMethod = user.membershipVerified ? 'google' : 'domain-claim';
    user.membershipVersion += 1;
    await user.save({ session });
    return user;
  });
}
async function tryAssignMembership(user) {
  try {
    const assigned = await assignMembership(user._id);
    if (assigned.membershipStatus === 'disabled') return { user: assigned, assignment: { status: 'disabled', code: 'MEMBERSHIP_DISABLED', message: 'Membership is disabled. Contact your administrator.', retryable: false } };
    return { user: assigned, assignment: assigned.hubId ? { status: 'assigned', retryable: false } : {
      status: 'unassigned', code: 'COLLEGE_DOMAIN_NOT_CONFIGURED', message: 'Your college email domain is not configured. You can retry after it is added.', retryable: true,
    } };
  } catch {
    // Account exists independently; rollback leaves it unassigned and safely retryable.
    const current = await User.findById(user._id);
    return { user: current, assignment: { status: 'pending', code: 'ASSIGNMENT_UNAVAILABLE', message: 'College assignment is temporarily unavailable. Please retry.', retryable: true } };
  }
}
async function seedColleges(connection = mongoose.connection) {
  const colleges = connection.model('College', College.schema);
  const hubs = connection.model('Hub', Hub.schema);
  const channels = connection.model('Channel', Channel.schema);
  await Promise.all([colleges.init(), hubs.init(), channels.init()]);
  for (const entry of config.colleges) {
    const fields = { ...entry, themeTokens: entry.themeTokens || config.defaultTheme, defaultChannels: config.defaultChannels };
    const candidate = new colleges(fields);
    await candidate.validate();
    const existing = await colleges.findOne({ slug: entry.slug });
    if (existing) { existing.set(fields); await existing.save(); }
    else await candidate.save();
  }
}
async function provisionConfiguredHubs(connection = mongoose.connection) {
  await seedColleges(connection);
  const active = await connection.model('College').find({ status: 'active' });
  for (const college of active) await ensureHubForCollege(college._id, undefined, connection);
  return active.length;
}
module.exports = { provisionConfiguredHubs, ensureHubForCollege, assignMembership, tryAssignMembership, seedColleges };
