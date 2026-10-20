// Additive only. Enabling CORE_SESSION_ENABLED is the deliberate bearer cutover.
module.exports = async function coreSessions({ db, session, cursor, batchSize }) {
  const rows = await db.collection('users').find(cursor ? { _id: { $gt: cursor } } : {}, { session }).sort({ _id: 1 }).limit(batchSize).toArray();
  for (const row of rows) if (row.sessionVersion === undefined) await db.collection('users').updateOne({ _id: row._id, sessionVersion: { $exists: false } }, { $set: { sessionVersion: 0 } }, { session });
  return { done: rows.length < batchSize, cursor: rows.at(-1)?._id || cursor };
};
