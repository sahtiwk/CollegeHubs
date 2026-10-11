const jwt = require('jsonwebtoken');
const { randomUUID } = require('node:crypto');
const { countFields } = require('@collegehubs/contracts/module-read.cjs');
const unavailable = () => ({ status: 'unavailable', asOf: null });
function createModuleReader(config, { env = process.env, fetcher = fetch, clock = Date.now } = {}) {
  const cache = new Map(), pending = new Map(), cooldown = new Map();
  let active = 0;
  const targets = {};
  for (const name of Object.keys(countFields)) {
    try {
      const origin = new URL(env[name.toUpperCase() + '_API_ORIGIN']);
      const key = env[name.toUpperCase() + '_READ_KEY'];
      if (!config.enabled.includes(name) || !config.privateKey || !/^[a-zA-Z0-9_-]{43}$/.test(key || '') || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash ||
          (origin.protocol !== 'https:' && !(env.NODE_ENV !== 'production' && origin.protocol === 'http:' && ['localhost','127.0.0.1'].includes(origin.hostname)))) continue;
      targets[name] = { origin: origin.origin, key };
    } catch { /* Optional service configuration never blocks Core. */ }
  }
  const cachedResult = row => row?.data && clock() - row.savedAt < 300000 ? { ...row.data, status: clock() - row.savedAt < 60000 ? 'ok' : 'stale' } : unavailable();
  async function read(name, owner, deadline) {
    const key = [name, owner.userId, owner.hubId, owner.membershipVersion].join(':');
    const previous = cache.get(key);
    if (previous && clock() < previous.retryAt) return cachedResult(previous);
    if (pending.has(key)) return pending.get(key);
    if (!targets[name] || (cooldown.get(name) || 0) > clock() || pending.size >= 500) return cachedResult(previous);
    const work = (async () => {
      // No queue of network requests: each aggregate has just two sequential workers.
      if (active >= 2 || deadline <= clock()) return cachedResult(previous);
      active++;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.max(1, deadline - clock()));
      try {
        const now = Math.floor(clock()/1000);
        const token = jwt.sign({ iss: config.issuer, aud: 'collegehubs-' + name, sub: String(owner.userId), hubId: String(owner.hubId), membershipVersion: owner.membershipVersion,
          scope: ['module:' + name + ':summary:read'], iat: now, nbf: now, exp: now + 30, jti: randomUUID() }, config.privateKey, { algorithm: 'RS256', keyid: config.kid });
        const response = await fetcher(targets[name].origin + '/api/' + name + '/integration/summary', { redirect: 'error', cache: 'no-store', signal: controller.signal,
          headers: { Authorization: 'Bearer ' + targets[name].key, 'X-Module-Read': token } });
        if (!response.ok || !response.body) throw new Error('unavailable');
        const reader = response.body.getReader(), chunks = []; let size = 0;
        for (;;) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > 2048) { await reader.cancel(); throw new Error('oversize'); } chunks.push(Buffer.from(part.value)); }
        const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        const fields = countFields[name];
        if (data.status !== 'ok' || typeof data.asOf !== 'string' || !Number.isFinite(Date.parse(data.asOf)) || Math.abs(clock()-Date.parse(data.asOf)) > 30000 ||
            Object.keys(data).length !== fields.length+2 || fields.some(field => !Number.isSafeInteger(data[field]) || data[field] < 0)) throw new Error('invalid summary');
        cooldown.delete(name);
        cache.delete(key); cache.set(key, { data, savedAt: clock(), retryAt: clock()+60000 });
        return data;
      } catch {
        cooldown.set(name, clock()+60000);
        cache.delete(key); cache.set(key, { ...previous, retryAt: clock()+60000 });
        const value = cachedResult(previous);
        return value.status === 'ok' ? { ...value, status: 'stale' } : value;
      } finally {
        clearTimeout(timer); active--;
        while (cache.size > 500) cache.delete(cache.keys().next().value);
      }
    })();
    pending.set(key, work);
    try { return await work; } finally { pending.delete(key); }
  }
  async function summary(owner) {
    const deadline = clock()+800, names = Object.keys(countFields), modules = {};
    let index = 0;
    const worker = async () => { while (index < names.length) { const name = names[index++]; modules[name] = await read(name, owner, deadline); } };
    await Promise.all([worker(), worker()]);
    return { schemaVersion: 1, asOf: new Date(clock()).toISOString(), modules };
  }
  return { summary };
}
module.exports = { createModuleReader };
