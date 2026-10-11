import express from 'express';
import { weakSkills } from './routes/weakSkills.ts';
import { summary } from './routes/summary.ts';
import type { ErrorRequestHandler } from 'express';
import type { LearnConfig, SessionStore } from './auth/sessionService.ts';
import { sessionRoutes } from './auth/sessionRoutes.ts';
import { learningRoutes } from './routes/learningRoutes.ts';
import type { Database } from './db/index.ts';
import { quizRoutes } from './routes/quizRoutes.ts';
import { integrationRoutes } from './routes/integrationRoutes.ts';

export function createApp({ config, pool, store }: { config: LearnConfig; pool: Database; store: SessionStore }) {
  const app = express(); app.disable('x-powered-by');
  app.use((_req, res, next) => { res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); next(); });
  app.get('/health/live', (_req, res) => res.json({ status: 'live', service: 'learn' }));
  app.get(['/health/ready', '/api/learn/health/ready'], async (_req, res) => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([pool.query('SELECT version, (SELECT session_hash FROM module_session LIMIT 0), (SELECT state_hash FROM module_handoff LIMIT 0), (SELECT user_id FROM learner LIMIT 0), (SELECT domain FROM learning_path LIMIT 0), (SELECT id FROM skill_node LIMIT 0), (SELECT id FROM content_item LIMIT 0), (SELECT user_id FROM enrollment LIMIT 0), (SELECT node_id FROM learner_node_state LIMIT 0), (SELECT node_id FROM node_prerequisite LIMIT 0)  , (SELECT id FROM quiz_attempt LIMIT 0), (SELECT seed_id FROM quiz_item LIMIT 0), (SELECT node_id FROM node_completion LIMIT 0), (SELECT event_id FROM learn_event LIMIT 0), (SELECT node_id FROM resource_cache LIMIT 0) FROM learn_schema WHERE version=2'), new Promise<never>((_resolve, reject) => { timeout = setTimeout(() => reject(new Error('timeout')), 3000); })]);
      if (result.rows[0]?.version !== 2) throw new Error('schema');
      res.json({ status: 'ready', service: 'learn' });
    }
    catch { res.status(503).json({ error: { code: 'LEARN_DATABASE_UNAVAILABLE', message: 'Learn storage is unavailable or its schema is not ready.', retryable: true } }); }
    finally { clearTimeout(timeout); }
  });
  app.use(express.json({ limit: '16kb' }));
  app.get('/api/learn/integration/weak-skills', weakSkills(pool, config));
  app.get('/api/learn/integration/summary', summary(pool, config));
  app.use('/api/learn/integration', integrationRoutes(pool,config));
  app.use('/api/learn', sessionRoutes(config, store));
  app.use('/api/learn', learningRoutes(pool, store));
  app.use('/api/learn', quizRoutes(pool,store,config));
  app.use((_req, res) => res.status(404).json({ error: { code: 'LEARN_ROUTE_NOT_FOUND', message: 'This Learn endpoint is unavailable.', retryable: false } }));
  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    const status = [400, 401, 403, 404, 409, 413, 429].includes(error.status) ? error.status : 503;
    if(status===429)res.set('Retry-After',String(error.retryAfter||60));
    res.status(status).json({ error: { code: status === 503 ? 'LEARN_UNAVAILABLE' : error.code || 'INVALID_REQUEST', message: status === 503 ? 'Learn is temporarily unavailable. Please retry.' : status === 413 ? 'The request is too large.' : error.type === 'entity.parse.failed' ? 'Send valid JSON.' : error.message, retryable: status === 503 || status === 429 } });
  };
  app.use(errors); return app;
}
