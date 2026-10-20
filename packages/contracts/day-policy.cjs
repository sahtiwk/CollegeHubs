const timezone = 'Asia/Kolkata', version = 1;
function assertPolicy(policy) {
  if (policy.timezone !== timezone || policy.timezonePolicyVersion !== version) throw new Error('Unsupported scoring day policy');
}
function dayKey(value) {
  const date = new Date(value);
  if (!Number.isFinite(+date)) throw new Error('Invalid activity time');
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
module.exports = { timezone, version, dayKey, assertPolicy };
