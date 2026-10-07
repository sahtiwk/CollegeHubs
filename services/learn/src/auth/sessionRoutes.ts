import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { LearnConfig, SessionStore } from './sessionService.ts';
import { sessionDto } from './sessionService.ts';

const failure = (status: number, code: string) => Object.assign(new Error(code), { status, code });
export const wrap = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => { Promise.resolve(fn(req, res)).catch(next); };
export function cookie(req: Request, name: string) {
  const entries = (req.headers.cookie || '').split(';').map(part => part.trim()).filter(part => part.startsWith('ch_learn_' + name + '='));
  return entries.length === 1 ? entries[0].split('=')[1] : '';
}
function setCookie(res: Response, config: LearnConfig, name: string, value: string, age: number) {
  res.append('Set-Cookie', `ch_learn_${name}=${value}; Path=/api/learn; HttpOnly;${config.secure ? ' Secure;' : ''} SameSite=Lax; Max-Age=${age}`);
}
function exactBody(req: Request, keys: string[]) {
  if (!req.is('application/json') || !req.body || Array.isArray(req.body) || Object.keys(req.body).some(key => !keys.includes(key)) || keys.some(key => typeof req.body[key] !== 'string')) throw failure(400, 'INVALID_BODY');
}
export function sessionRoutes(config: LearnConfig, store: SessionStore) {
  const router = Router();
  const buckets = new Map<string, { count: number; until: number }>();
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (Object.keys(req.query).length) return next(failure(400, 'QUERY_NOT_ALLOWED'));
    if (req.get('Origin') && req.get('Origin') !== config.origin) return next(failure(403, 'ORIGIN_FORBIDDEN'));
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.get('Origin') !== config.origin) return next(failure(403, 'ORIGIN_FORBIDDEN'));
    next();
  });
  router.post('/auth/start', wrap(async (req, res) => {
    if (req.body && (Array.isArray(req.body) || Object.keys(req.body).length)) throw failure(400, 'INVALID_BODY');
    // A bounded, per-process abuse brake, not a distributed rate-limit promise.
    const now = Date.now(); for (const [key, value] of buckets) if (value.until <= now) buckets.delete(key);
    const key = req.ip || 'unknown', value = buckets.get(key) || { count: 0, until: now + 60000 };
    if (value.count >= 30 || (buckets.size >= 10000 && !buckets.has(key))) { res.set('Retry-After', '60'); throw failure(429, 'START_RATE_LIMIT'); }
    value.count++; buckets.set(key, value);
    const state = await store.start(); setCookie(res, config, 'state', state, 60);
    res.status(201).json({ state, expiresIn: 60 });
  }));
  router.post('/auth/callback', wrap(async (req, res) => {
    exactBody(req, ['module', 'state', 'grant']);
    const result = await store.callback({ ...req.body, origin: req.get('Origin'), cookieState: cookie(req, 'state') });
    setCookie(res, config, 'state', '', 0);
    setCookie(res, config, 'session', result.handle, Math.max(0, Math.min(900, Math.floor((+result.expiresAt - Date.now()) / 1000))));
    res.json({ ready: true });
  }));
  router.get('/session', wrap(async (req, res) => { const handle = cookie(req, 'session'); res.json(sessionDto(await store.get(handle), handle)); }));
  router.post('/logout', wrap(async (req, res) => {
    await store.logout(cookie(req, 'session'), req.get('Origin'), req.get('X-CSRF-Token'));
    setCookie(res, config, 'state', '', 0); setCookie(res, config, 'session', '', 0); res.json({ signedOut: true });
  }));
  router.get('/spike/graph', wrap(async (req, res) => {
    const row = await store.get(cookie(req, 'session'));
    res.json({ userId: row.user_id, hubId: row.hub_id, synthetic: true, graph: {
      nodes: [
        { id: 'foundations', label: 'Programming foundations', category: 'Start here', status: 'unlocked', description: 'Read values, variables and expressions. This is illustrative content.' },
        { id: 'arrays', label: 'Arrays & sequences', category: 'Explore', status: 'locked', description: 'Explore ordered collections after foundations.' },
        { id: 'branches', label: 'Decisions & loops', category: 'Explore', status: 'locked', description: 'Describe repeated work and conditional choices.' },
        { id: 'patterns', label: 'Problem-solving patterns', category: 'Connect', status: 'locked', description: 'Connect the two branches into a small practice problem.' }
      ], links: [{ source: 'foundations', target: 'arrays' }, { source: 'foundations', target: 'branches' }, { source: 'arrays', target: 'patterns' }, { source: 'branches', target: 'patterns' }]
    } });
  }));
  return router;
}
