// Expiry is enforced on reads and generation, even when the process has slept.
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const expiresAt = row => row.expiresAt || new Date(+row.createdAt + RETENTION_MS);
const liveResume = (at = new Date()) => ({ $or: [
  { expiresAt: { $gt: at } },
  { expiresAt: { $exists: false }, createdAt: { $gt: new Date(+at - RETENTION_MS) } },
] });
function resumeRetention(connection, models) {
  async function remove(scope, id, at, expiredOnly = false) {
    return connection.transaction(async session => {
      const row = await models.Resume.findOne({ ...scope, _id: id }).session(session);
      if (!row || expiredOnly && +expiresAt(row) > +at) return false;
      await models.Resume.deleteOne({ ...scope, _id: id }, { session });
      await models.Interview.updateMany({ ...scope, resumeId: id, status: 'generating' },
        { $set: { status: 'generation_failed', generationLease: null, lastError: 'RESUME_UNAVAILABLE' } }, { session });
      await models.Interview.updateMany({ ...scope, resumeId: id },
        { $set: { resumeId: null, resumeUnavailable: true } }, { session });
      return true;
    });
  }
  async function cleanup(scope = {}, at = new Date()) {
    const rows = await models.Resume.find({ ...scope, $nor: [liveResume(at)] }).sort({ createdAt: 1, _id: 1 }).limit(100).select('_id userId hubId').lean();
    for (const row of rows) await remove({ userId: row.userId, hubId: row.hubId }, row._id, at, true);
    return rows.length;
  }
  return { remove, cleanup };
}
module.exports = { RETENTION_MS, expiresAt, liveResume, resumeRetention };
