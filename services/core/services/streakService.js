const Activity = require('../models/DailyActivity');
const dayKey = date => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
const previous = day => new Date(Date.parse(day + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10);
function countDays(days, today) {
  const keys = new Set(days); let current = keys.has(today) ? today : previous(today), count = 0;
  while (keys.has(current)) { count++; current = previous(current); }
  return count;
}
async function read(userId, now = new Date()) {
  const today = dayKey(now);
  // Global user/day identity intentionally spans qualifying sources and Hub changes.
  const rows = await Activity.find({ userId, timezonePolicyVersion: 1, dayKey: { $lte: today } }).select('dayKey').sort({ dayKey: -1 }).maxTimeMS(2000).lean();
  return { currentStreak: countDays(rows.map(row => row.dayKey), today), today, activeToday: rows.some(row => row.dayKey === today), lastActiveDay: rows[0]?.dayKey || null, timezone: 'Asia/Kolkata' };
}
module.exports = { read, countDays, dayKey };
