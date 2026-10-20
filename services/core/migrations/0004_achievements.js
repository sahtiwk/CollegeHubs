const { project } = require('../services/achievementService');
module.exports = async function achievements({ db, session, cursor, batchSize }) {
  const users = await db.collection('users').find({ ...(cursor ? { _id: { $gt: cursor } } : {}), hubId: { $ne: null } }, { session }).sort({ _id: 1 }).limit(batchSize).toArray();
  for (const user of users) await project(db, { userId: user._id, hubId: user.hubId }, session);
  return { done: users.length < batchSize, cursor: users.at(-1)?._id || cursor };
};
// Index preparation is additive and idempotent, outside the data transaction.
module.exports.prepare = async db => {
  await db.collection('nativefacts').createIndex({ hubId: 1, userId: 1, type: 1, occurredAt: 1 });
  await db.collection('auraevents').createIndex({ hubId: 1, userId: 1, canonical: 1, _id: -1 });
  await db.collection('achievementawards').createIndex({ userId: 1, badgeId: 1 }, { unique: true });
  await db.collection('achievementawards').createIndex({ hubId: 1, userId: 1 });
};
