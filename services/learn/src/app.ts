import express from 'express';
import type { ErrorRequestHandler } from 'express';
import type { LearnConfig, SessionStore } from './auth/sessionService.ts';
import { sessionRoutes } from './auth/sessionRoutes.ts';
import { learningRoutes } from './routes/learningRoutes.ts';
import type { Database } from './db/index.ts';

export function createApp({ config, pool, store }: { config: LearnConfig; pool: Database; store: SessionStore }) {
  const app = express(); app.disable('x-powered-by');
  app.use((_req, res, next) => { res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); next(); });
  app.get('/health/live', (_req, res) => res.json({ status: 'live', service: 'learn' }));
  app.get(['/health/ready', '/api/learn/health/ready'], async (_req, res) => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([pool.query('SELECT version, (SELECT session_hash FROM module_session LIMIT 0), (SELECT state_hash FROM module_handoff LIMIT 0), (SELECT user_id FROM learner LIMIT 0), (SELECT domain FROM learning_path LIMIT 0), (SELECT id FROM skill_node LIMIT 0), (SELECT id FROM content_item LIMIT 0), (SELECT user_id FROM enrollment LIMIT 0), (SELECT node_id FROM learner_node_state LIMIT 0), (SELECT node_id FROM node_prerequisite LIMIT 0) FROM learn_schema WHERE version=1'), new Promise<never>((_resolve, reject) => { timeout = setTimeout(() => reject(new Error('timeout')), 3000); })]);
      if (result.rows[0]?.version !== 1) throw new Error('schema');
      res.json({ status: 'ready', service: 'learn' });
    }
    catch { res.status(503).json({ error: { code: 'LEARN_DATABASE_UNAVAILABLE', message: 'Learn storage is unavailable or its schema is not ready.', retryable: true } }); }
    finally { clearTimeout(timeout); }
  });
  app.use(express.json({ limit: '16kb' }));
  app.use('/api/learn', sessionRoutes(config, store));
  app.use('/api/learn', learningRoutes(pool, store));
  app.use((_req, res) => res.status(404).json({ error: { code: 'LEARN_ROUTE_NOT_FOUND', message: 'This Learn endpoint is unavailable.', retryable: false } }));
  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    const status = [400, 401, 403, 404, 409, 413, 429].includes(error.status) ? error.status : 503;
    res.status(status).json({ error: { code: status === 503 ? 'LEARN_UNAVAILABLE' : error.code || 'INVALID_REQUEST', message: status === 503 ? 'Learn is temporarily unavailable. Please retry.' : status === 413 ? 'The request is too large.' : error.type === 'entity.parse.failed' ? 'Send valid JSON.' : error.message, retryable: status === 503 || status === 429 } });
  };
  app.use(errors); return app;
}
