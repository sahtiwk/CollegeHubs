const Room = require('../models/StudyRoom');
const mongoose = require('mongoose');
const study = require('./studyService');
async function scan(publish = async () => {}) {
  // Bounded batches; DB time is authoritative. Due index bounds the active-room scan.
  const { localTime } = await mongoose.connection.db.command({ hello: 1 });
  const rows = await Room.find({ status: 'active', endAt: { $lte: localTime } }).sort({ endAt: 1 }).limit(100).select('_id').maxTimeMS(2000).lean();
  let closed = 0;
  for (const row of rows) {
    try {
      const result = await study.closeDue(String(row._id));
      if (result) { closed++; await publish(result); }
    } catch { console.error('Study room closure unavailable; a later scan will retry'); }
  }
  await require('./studyFactService').reconcile();
  return { examined: rows.length, closed };
}
async function start(publish) {
  let stopped = false, running = null;
  const tick = () => {
    if (stopped || running) return running;
    running = scan(publish).catch(() => console.error('Study deadline recovery unavailable; next scan will retry')).finally(() => { running = null; });
    return running;
  };
  // Startup recovery precedes accepting requests; larger backlogs continue in bounded ticks.
  await tick();
  const timer = setInterval(tick, 1000); timer.unref();
  return async () => { stopped = true; clearInterval(timer); await running; };
}
module.exports = { scan, start };
