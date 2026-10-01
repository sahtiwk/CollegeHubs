import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { proxyApi } from './functions/api/[[path]].ts';
function apiGateway(env) {
  return { name: 'collegehubs-api-gateway', configureServer: install, configurePreviewServer: install };
  function install(server) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/api/') && req.url !== '/api') return next();
      try {
        let size = 0; const chunks = [];
        for await (const part of req) { size += part.length; if (size > 65536) { res.writeHead(413, { 'Content-Type': 'application/json' }); return res.end('{"error":{"code":"BODY_TOO_LARGE"}}'); } chunks.push(part); }
        const headers = new Headers(); for (const [key, value] of Object.entries(req.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
        const request = new Request('http://' + (req.headers.host || 'localhost') + req.url, { method: req.method, headers, ...(!['GET', 'HEAD'].includes(req.method) ? { body: Buffer.concat(chunks) } : {}) });
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
  const env = { ...vars, CORE_API_ORIGIN: vars.CORE_API_ORIGIN || 'http://127.0.0.1:5000', LEARN_API_ORIGIN: vars.LEARN_API_ORIGIN || 'http://127.0.0.1:5001' };
  return { plugins: [react(), apiGateway(env)], optimizeDeps: { include: ['@collegehubs/contracts/channel.cjs'] }, resolve: { dedupe: ['react', 'react-dom'] }, server: { port: 5173, strictPort: true }, preview: { port: 5173, strictPort: true } };
});
