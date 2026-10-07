import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { proxyApi } from './functions/api/[[path]].ts';
function apiGateway(env) {
  return { name: 'collegehubs-api-gateway', configureServer: install, configurePreviewServer: install };
  function install(server) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/api/') && req.url !== '/api') return next();
      try {
        const abort = new AbortController(); req.once('aborted', () => abort.abort()); res.once('close', () => { if (!res.writableEnded) abort.abort(); });
        let closed = false, cleanup = () => {};
        const stream = new ReadableStream({ start(controller) {
          req.pause();
          cleanup = () => { req.off('data', data); req.off('end', end); req.off('error', error); };
          const data = chunk => { if (!closed) { controller.enqueue(new Uint8Array(chunk)); if (controller.desiredSize <= 0) req.pause(); } };
          const end = () => { if (!closed) { closed = true; cleanup(); controller.close(); } };
          const error = () => { if (!closed) { closed = true; cleanup(); controller.error(new Error('REQUEST_ABORTED')); } };
          req.on('data', data); req.once('end', end); req.once('error', error);
        }, pull() { if (!closed) req.resume(); }, cancel() { closed = true; cleanup(); req.resume(); } }, { highWaterMark: 65536, size: chunk => chunk.byteLength });
        const headers = new Headers(); for (const [key, value] of Object.entries(req.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
        const request = new Request('http://' + (req.headers.host || 'localhost') + req.url, { method: req.method, headers, signal: abort.signal, ...(!['GET', 'HEAD'].includes(req.method) ? { body: stream, duplex: 'half' } : {}) });
        const result = await proxyApi(request, env, fetch, true);
        res.statusCode = result.status;
        for (const [key, value] of result.headers) if (key !== 'set-cookie') res.setHeader(key, value);
        if (result.headers.getSetCookie().length) res.setHeader('Set-Cookie', result.headers.getSetCookie());
        res.end(Buffer.from(await result.arrayBuffer()));
      } catch { res.writeHead(503, { 'Content-Type': 'application/json' }); res.end('{"error":{"code":"GATEWAY_UNAVAILABLE"}}'); }
    });
  }
}
export default defineConfig(({ mode }) => {
  const vars = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  const env = { ...vars, CORE_API_ORIGIN: vars.CORE_API_ORIGIN || 'http://127.0.0.1:5000', LEARN_API_ORIGIN: vars.LEARN_API_ORIGIN || 'http://127.0.0.1:5003', ARCADE_API_ORIGIN: vars.ARCADE_API_ORIGIN || 'http://127.0.0.1:5001', INTERVIEW_API_ORIGIN: vars.INTERVIEW_API_ORIGIN || 'http://127.0.0.1:5002' };
  return { plugins: [react(), apiGateway(env)], optimizeDeps: { include: ['@collegehubs/contracts/channel.cjs'] }, resolve: { dedupe: ['react', 'react-dom'] }, server: { port: 5173, strictPort: true }, preview: { port: 5173, strictPort: true } };
});
