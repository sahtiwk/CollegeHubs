type Bindings = { CORE_API_ORIGIN?: string; LEARN_API_ORIGIN?: string; ARCADE_API_ORIGIN?: string; INTERVIEW_API_ORIGIN?: string };
const json = (status: number, code: string) => new Response(JSON.stringify({ error: { code, retryable: status === 503 } }), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
export async function proxyApi(request: Request, env: Bindings, fetcher: typeof fetch = fetch, allowLocal = false) {
  const incoming = new URL(request.url);
  if (incoming.pathname === '/api') return json(404, 'API_ROUTE_NOT_FOUND');
  if (!incoming.pathname.startsWith('/api/') || /%2e|%2f|%5c|\\|\/\//i.test(incoming.pathname)) return json(400, 'INVALID_API_PATH');
  const module = /^\/api\/(learn|arcade|interview)(?:\/|$)/.exec(incoming.pathname)?.[1];
  const value = module ? env[`${module.toUpperCase()}_API_ORIGIN` as keyof Bindings] : env.CORE_API_ORIGIN;
  if (!value) return json(503, 'SERVICE_UNAVAILABLE');
  let upstream: URL;
  try {
    upstream = new URL(value);
    if (upstream.username || upstream.password || upstream.pathname !== '/' || upstream.search || upstream.hash || (upstream.protocol !== 'https:' && !(allowLocal && upstream.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(upstream.hostname)))) throw new Error('origin');
  } catch { return json(503, 'SERVICE_CONFIGURATION'); }
  upstream.pathname = incoming.pathname; upstream.search = incoming.search;
  const headers = new Headers();
  // Never accept an upstream URL/header from the caller. Do not send a Core bearer to a module.
  for (const name of ['content-type', 'accept', 'origin', 'cookie', ...(module ? ['x-csrf-token'] : ['authorization', 'x-core-csrf'])]) {
    const value = request.headers.get(name);
    if (name === 'cookie') {
      if (value) { const selected = value.split(';').map(item => item.trim()).filter(item => (module ? ['ch_' + module + '_state', 'ch_' + module + '_session'] : ['ch_core_refresh']).includes(item.split('=')[0])).join('; '); if (selected) headers.set(name, selected); }
    } else if (value) headers.set(name, value);
  }
  const upload = request.method === 'POST' && incoming.pathname === '/api/interview/resumes/upload';
  let overflow = false;
  let body: Uint8Array | ReadableStream<Uint8Array> | undefined;
  if (!['GET', 'HEAD'].includes(request.method) && request.body) {
    if (upload) {
      const reader = request.body.getReader(); let length = 0;
      body = new ReadableStream<Uint8Array>({ async pull(controller) { const part = await reader.read(); if (part.done) return controller.close(); length += part.value.length; if (length > 5 * 1024 * 1024 + 65536) { overflow = true; await reader.cancel(); controller.error(new Error('BODY_TOO_LARGE')); } else controller.enqueue(part.value); }, cancel(reason) { return reader.cancel(reason); } });
    } else {
    const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let length = 0;
    for (;;) { const part = await reader.read(); if (part.done) break; length += part.value.length; if (length > 65536) { await reader.cancel(); return json(413, 'BODY_TOO_LARGE'); } chunks.push(part.value); }
    body = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
    }
  }
  try {
    const response = await fetcher(upstream, { method: request.method, headers, body, ...(upload ? { duplex: 'half' } : {}), redirect: 'manual', signal: AbortSignal.any([request.signal, AbortSignal.timeout(incoming.pathname.endsWith('/health/ready') ? 75000 : 15000)]) } as RequestInit);
    if (overflow) return json(413, 'BODY_TOO_LARGE');
    if (response.status >= 300 && response.status < 400) return json(502, 'UPSTREAM_REDIRECT_REJECTED');
    const calendarExport = request.method === 'GET' && /^\/api\/hubs\/[a-f0-9]{24}\/calendar\/export\.ics$/.test(incoming.pathname) && response.status === 200 && response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() === 'text/calendar';
    if (!calendarExport && !response.headers.get('content-type')?.includes('application/json') && response.status !== 204) return json(502, 'UPSTREAM_NOT_JSON');
    const forwarded = new Headers({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    if (calendarExport) forwarded.set('Content-Disposition', 'attachment; filename="collegehubs-calendar.ics"');
    for (const name of ['content-type', 'retry-after', ...(module ? [] : ['x-core-csrf'])]) { const value = response.headers.get(name); if (value) forwarded.set(name, value); }
    for (const cookie of response.headers.getSetCookie()) {
      const name = cookie.slice(0, cookie.indexOf('='));
      if ((module ? ['ch_' + module + '_state', 'ch_' + module + '_session'] : ['ch_core_refresh']).includes(name)) forwarded.append('Set-Cookie', cookie);
    }
    return new Response(response.body, { status: response.status, headers: forwarded });
  } catch { return json(overflow ? 413 : 503, overflow ? 'BODY_TOO_LARGE' : 'SERVICE_UNAVAILABLE'); }
}
export const onRequest = ({ request, env }: { request: Request; env: Bindings }) => proxyApi(request, env);
