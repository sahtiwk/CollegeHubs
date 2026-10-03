const { randomUUID } = require('node:crypto');
const Contest = require('../models/Contest');
const { fetchContests } = require('../integrations/codeforces');
const FRESH_MS = 15 * 60 * 1000, RETRY_MS = 5 * 60 * 1000;
const enabled = () => process.env.SCHEDULE_REFRESH_ENABLED !== 'false';
function createProviderRefresh({ load = fetchContests, enabled: isEnabled = enabled, provenance = 'provider' } = {}) {
  async function refresh() {
    if (!isEnabled()) return;
    const now = new Date(); const leaseId = randomUUID();
    try { await Contest.updateOne({ provider: 'codeforces' }, { $setOnInsert: { provider: 'codeforces' } }, { upsert: true }); }
    catch (error) { if (error.code !== 11000) throw error; }
    const locked = await Contest.findOneAndUpdate({ provider: 'codeforces', nextAttemptAt: { $lte: now }, leaseUntil: { $lte: now } }, { $set: { leaseId, leaseUntil: new Date(+now + 30000), nextAttemptAt: new Date(+now + RETRY_MS), lastAttemptAt: now } }, { new: true });
    if (!locked) return;
    try {
      const items = await load(); const finished = new Date();
      await Contest.updateOne({ provider: 'codeforces', leaseId }, { $set: { items, fetchedAt: finished, provenance, lastError: null, leaseUntil: new Date(0), leaseId: null, nextAttemptAt: new Date(+finished + FRESH_MS) } }, { runValidators: true });
    } catch {
      // Failure never replaces the last-good generation or its provenance/timestamp.
      await Contest.updateOne({ provider: 'codeforces', leaseId }, { $set: { lastError: 'PROVIDER_UNAVAILABLE', leaseId: null, leaseUntil: new Date(0) } });
    }
  }
  return { refresh };
}
module.exports = { ...createProviderRefresh(), createProviderRefresh, FRESH_MS, enabled };
