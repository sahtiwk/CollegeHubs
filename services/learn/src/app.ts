import express from 'express';
import type { ErrorRequestHandler } from 'express';
import type { LearnConfig, SessionStore } from './auth/sessionService.ts';
import { sessionRoutes } from './auth/sessionRoutes.ts';

export function createApp({ config, pool, store }: { config: LearnConfig; pool: { query(sql: string): Promise<unknown> }; store: SessionStore }) {
  const app = express(); app.disable('x-powered-by');
  app.use((_req, res, next) => { res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); next(); });
  app.get('/health/live', (_req, res) => res.json({ status: 'live', service: 'learn' }));
  app.get(['/health/ready', '/api/learn/health/ready'], async (_req, res) => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try { await Promise.race([pool.query('SELECT session_hash FROM module_session LIMIT 0'), new Promise((_resolve, reject) => { timeout = setTimeout(() => reject(new Error('timeout')), 3000); })]); res.json({ status: 'ready', service: 'learn' }); }
    catch { res.status(503).json({ error: { code: 'LEARN_DATABASE_UNAVAILABLE', retryable: true } }); }
    finally { clearTimeout(timeout); }
  });
  app.use(express.json({ limit: '16kb' }));
  app.use('/api/learn', sessionRoutes(config, store));
  app.use((_req, res) => res.status(404).json({ error: { code: 'LEARN_ROUTE_NOT_FOUND', retryable: false } }));
  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    const status = [400, 401, 403, 409, 413, 429].includes(error.status) ? error.status : 503;
    res.status(status).json({ error: { code: status === 503 ? 'LEARN_UNAVAILABLE' : error.code || 'INVALID_REQUEST', retryable: status === 503 || status === 429 } });
  };
  app.use(errors); return app;
}
