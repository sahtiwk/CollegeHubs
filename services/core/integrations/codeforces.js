const ENDPOINT = 'https://codeforces.com/api/contest.list?gym=false';
function normalize(data) {
  if (data?.status !== 'OK' || !Array.isArray(data.result) || data.result.length > 20000) throw new Error('Invalid provider response');
  const found = new Map();
  for (const row of data.result) {
    if (!row || typeof row.phase !== 'string') throw new Error('Invalid contest');
    if (!['BEFORE', 'CODING'].includes(row.phase)) continue;
    if (!Number.isSafeInteger(row.id) || row.id < 1 || typeof row.name !== 'string' || !row.name.trim() || row.name.length > 300 ||
      !Number.isSafeInteger(row.startTimeSeconds) || row.startTimeSeconds < 1 || row.startTimeSeconds > 7258118400 ||
      !Number.isSafeInteger(row.durationSeconds) || row.durationSeconds < 1 || row.durationSeconds > 31536000) throw new Error('Invalid contest');
    const item = { providerId: String(row.id), title: row.name.trim(), startsAt: new Date(row.startTimeSeconds * 1000), endsAt: new Date((row.startTimeSeconds + row.durationSeconds) * 1000), url: 'https://codeforces.com/contest/' + row.id };
    const prior = found.get(item.providerId);
    if (prior && JSON.stringify(prior) !== JSON.stringify(item)) throw new Error('Conflicting provider ID');
    found.set(item.providerId, item);
  }
  if (found.size > 500) throw new Error('Too many upcoming contests');
  return [...found.values()].sort((a, b) => a.startsAt - b.startsAt || a.providerId.localeCompare(b.providerId));
}
async function fetchContests({ fetcher = fetch, timeoutMs = 6000, maxBytes = 4 * 1024 * 1024 } = {}) {
  // Statistics and schedules share the provider's aggregate request budget when enabled.
  if (require('../config/externalProviders').config().codeforces) await require('../services/providerBudget').reserve();
  const controller = new AbortController(); let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('Provider timeout')); }, timeoutMs); });
  try {
    return await Promise.race([timeout, (async () => {
      const response = await fetcher(ENDPOINT, { signal: controller.signal, redirect: 'error', headers: { Accept: 'application/json' } });
      if (!response.ok || !response.body || Number(response.headers.get('content-length')) > maxBytes) throw new Error('Provider unavailable');
      const reader = response.body.getReader(); const chunks = []; let size = 0;
      try {
        while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > maxBytes) throw new Error('Provider payload too large'); chunks.push(Buffer.from(value)); }
      } finally { await reader.cancel().catch(() => {}); }
      return normalize(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    })()]);
  } finally { clearTimeout(timer); controller.abort(); }
}
module.exports = { ENDPOINT, normalize, fetchContests };
