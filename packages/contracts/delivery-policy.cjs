const replayWindowMs = 30 * 86400000;
function expired(payload, now = Date.now()) { return Number.isFinite(Date.parse(payload?.occurredAt)) && Date.parse(payload.occurredAt) < now - replayWindowMs; }
function attentionCode(status, data) {
  if (![400,401,403,409,413].includes(status)) return null;
  const code = data?.error?.code;
  return typeof code === 'string' && /^[A-Z0-9_]{1,80}$/.test(code) ? code : 'CORE_DELIVERY_REJECTED';
}
module.exports = { replayWindowMs, expired, attentionCode };
