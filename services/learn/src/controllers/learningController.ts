import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import type { SessionStore } from '../auth/sessionService.ts';
import { cookie } from '../auth/sessionRoutes.ts';
import type { Database, Owner } from '../db/index.ts';
import { learnerService, fail, domainValue, ratingValue, preferencesValue, nodeId } from '../services/learnerService.ts';

function body(req: Request, keys: string[]) {
  if (!req.is('application/json') || !req.body || typeof req.body !== 'object' || Array.isArray(req.body) || Object.keys(req.body).length !== keys.length || keys.some(k => !Object.hasOwn(req.body, k))) throw fail(400, 'INVALID_BODY', 'Send only the documented JSON fields.');
  return req.body;
}
export function learningController(pool: Database, store: SessionStore) {
  const service = learnerService(pool);
  const handler = (work: (o: Owner, req: Request) => unknown) => async (req: Request, res: Response) => {
    const session = await store.get(cookie(req, 'session'));
    if (!['GET', 'HEAD'].includes(req.method)) {
      const csrf = req.get('X-CSRF-Token');
      if (!csrf || !/^[a-f0-9]{64}$/.test(csrf) || !/^[a-f0-9]{64}$/.test(session.csrf_hash || '') ||
        !timingSafeEqual(createHash('sha256').update(csrf).digest(), Buffer.from(session.csrf_hash, 'hex'))) throw fail(403, 'CSRF_INVALID', 'Reconnect Learn before saving changes.');
    }
    res.json(await work({ userId: session.user_id, hubId: session.hub_id }, req));
  };
  return {
    domains: handler(o => service.domains(o)), graph: handler(o => service.graph(o)),
    stats: handler(o => service.stats(o)), milestones: handler(o => service.milestones(o)),
    profile: handler(o => service.profile(o)),
    preferences: handler((o, req) => service.preferences(o, preferencesValue(body(req, ['goal', 'dailyMinutes'])))),
    onboardingProfile: handler((_o, req) => service.onboardingProfile(domainValue(body(req, ['domain']).domain))),
    onboard: handler((o, req) => { const b = body(req, ['domain', 'selfRating', 'goal', 'dailyMinutes']); return service.onboard(o, domainValue(b.domain), ratingValue(b.selfRating), preferencesValue(b)); }),
    intake: handler((o, req) => { const b = body(req, ['domain', 'selfRating']); return service.intake(o, domainValue(b.domain), ratingValue(b.selfRating)); }),
    initialize: handler((o, req) => service.initialize(o, domainValue(body(req, ['domain']).domain))),
    node: handler((o, req) => service.node(o, nodeId(req.params.id))),
    recommend: handler((o, req) => service.recommend(o, nodeId(body(req, ['nodeId']).nodeId))),
    tutor: handler((o, req) => { const b = body(req, ['nodeId', 'contentId']); return service.tutor(o, nodeId(b.nodeId), nodeId(b.contentId)); }),
    reset: handler((o, req) => service.reset(o, domainValue(body(req, ['domain']).domain)))
  };
}
