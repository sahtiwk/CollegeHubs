async function jsonRequest(url, options = {}, fetcher = fetch) {
  const response = await fetcher(url, { ...options, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(4000) });
  if (!response.headers.get('content-type')?.includes('application/json') || !response.body) throw Error('Invalid Core response');
  const reader = response.body.getReader(), chunks = []; let bytes = 0;
  try { for (;;) { const part = await reader.read(); if (part.done) break; bytes += part.value.byteLength; if (bytes > 16384) throw Error('Core response too large'); chunks.push(Buffer.from(part.value)); } }
  finally { await reader.cancel().catch(() => {}); }
  return { status: response.status, ok: response.ok, data: JSON.parse(Buffer.concat(chunks).toString('utf8')) };
}
module.exports = { jsonRequest };
