const Solution = require('../models/StudySolution');
const Room = require('../models/StudyRoom');
const native = require('./nativeFactService');
async function reconcile(filter = {}, { applyNativeFact = null } = {}) {
  // Internal bounded recovery only; callers construct all filters from authorized storage.
  const rows = await Solution.find({ ...filter, awardStatus: 'pending', sealedAt: { $ne: null } }).sort({ sealedAt: 1 }).limit(50).select('_id').lean();
  for (const row of rows) {
    try {
      await native.transaction(async session => {
        const solution = await Solution.findOne({ _id: row._id, awardStatus: 'pending' }).session(session);
        if (!solution) return;
        const room = await Room.findOne({ _id: solution.roomId, hubId: solution.hubId, status: 'review', participantIds: solution.userId }).session(session);
        if (!room || !solution.source.trim() || !solution.savedAt || solution.revision < 1) throw new Error('Study completion invariant failed');
        const fact = await native.record({ message: { _id: solution._id, hubId: solution.hubId, authorId: solution.userId }, type: 'study.completed', occurredAt: room.endAt }, session, applyNativeFact);
        if (fact.eventId !== solution.awardEventId) throw new Error('Study event identity mismatch');
        solution.awardStatus = fact.status; await solution.save({ session });
      });
    } catch { /* Saved result remains pending; subsequent due/startup/owned-read retries it. */ }
  }
}
module.exports = { reconcile };
