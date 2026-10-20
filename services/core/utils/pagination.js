const { createHmac, timingSafeEqual } = require('node:crypto');
const { badInput } = require('./validation');
function signature(value) {
  return createHmac('sha256', process.env.JWT_SECRET).update('core-pagination-v1:' + value).digest('base64url');
}
function cursorFor(kind, hubId, row) {
  const value = Buffer.from(JSON.stringify({ kind, hubId: String(hubId), id: String(row._id),
    key: kind === 'posts' ? new Date(row.createdAt).toISOString() : row.auraPoints })).toString('base64url');
  return value + '.' + signature(value);
}
function pageInput(query, kind, hubId) {
  const limit = query.limit === undefined ? 20 : Number(query.limit);
  if ((query.limit !== undefined && (typeof query.limit !== 'string' || !/^\d+$/.test(query.limit))) || !Number.isInteger(limit) || limit < 1 || limit > 50) throw badInput('Limit must be between 1 and 50');
  let after = {};
  if (query.cursor !== undefined) {
    try {
      if (typeof query.cursor !== 'string' || query.cursor.length > 1024) throw new Error();
      const parts = query.cursor.split('.');
      if (parts.length !== 2) throw new Error();
      const expected = Buffer.from(signature(parts[0])); const supplied = Buffer.from(parts[1]);
      if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw new Error();
      const cursor = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      if (cursor.kind !== kind || cursor.hubId !== String(hubId) || !/^[a-f0-9]{24}$/.test(cursor.id)) throw new Error();
      if (kind.startsWith('aura-history:')) {
        after = { _id: { $lt: cursor.id } };
      } else if (kind === 'posts') {
        if (typeof cursor.key !== 'string' || !Number.isFinite(Date.parse(cursor.key))) throw new Error();
        const date = new Date(cursor.key);
        after = { $or: [{ createdAt: { $lt: date } }, { createdAt: date, _id: { $gt: cursor.id } }] };
      } else {
        if (!Number.isFinite(cursor.key)) throw new Error();
        after = { $or: [{ auraPoints: { $lt: cursor.key } }, { auraPoints: cursor.key, _id: { $gt: cursor.id } }] };
      }
    } catch { throw badInput('Invalid cursor for this Hub and resource'); }
  }
  return { limit, after };
}
module.exports = { cursorFor, pageInput };
