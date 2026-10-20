const { fail } = require('../errors');
function pageQuery(query = {}) {
  if (Object.keys(query).some(k => k !== 'cursor') || query.cursor !== undefined && (typeof query.cursor !== 'string' || query.cursor.length > 160)) throw fail(400, 'INVALID_CURSOR');
  if (!query.cursor) return {};
  try {
    const decoded = Buffer.from(query.cursor, 'base64url').toString('utf8');
    const [date, id] = JSON.parse(decoded);
    if (!/^[a-f0-9]{24}$/.test(id) || typeof date !== 'string' || new Date(date).toISOString() !== date ||
        JSON.stringify([date, id]) !== decoded) throw Error();
    return { $or: [{ createdAt: { $lt: new Date(date) } }, { createdAt: new Date(date), _id: { $lt: id } }] };
  } catch { throw fail(400, 'INVALID_CURSOR'); }
}
async function historyPage(Model, scope, query, dto) {
  const rows = await Model.find({ ...scope, ...pageQuery(query) }).sort({ createdAt: -1, _id: -1 }).limit(21);
  const page = rows.slice(0, 20), last = page.at(-1);
  return { items: page.map(dto), nextCursor: rows.length > 20 ? Buffer.from(JSON.stringify([last.createdAt.toISOString(), String(last._id)])).toString('base64url') : null };
}
module.exports = { pageQuery, historyPage };
