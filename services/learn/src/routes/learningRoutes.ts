import { Router } from 'express';
import { wrap } from '../auth/sessionRoutes.ts';
import type { SessionStore } from '../auth/sessionService.ts';
import type { Database } from '../db/index.ts';
import { learningController } from '../controllers/learningController.ts';

// Mounted after the module's common no-query / exact-Origin boundary.
// Only this explicit inventory is reachable; no legacy catch-all handlers.
export function learningRoutes(pool: Database, store: SessionStore) {
  const r = Router(), c = learningController(pool, store);
  r.get('/dashboard/domains', wrap(c.domains)); r.get('/dashboard/graph', wrap(c.graph));
  r.get('/dashboard/stats', wrap(c.stats)); r.get('/dashboard/milestones', wrap(c.milestones));
  r.get('/profile/preferences', wrap(c.profile)); r.put('/profile/preferences', wrap(c.preferences));
  r.post('/onboarding/profile', wrap(c.onboardingProfile)); r.post('/onboarding', wrap(c.onboard));
  r.post('/learner/intake', wrap(c.intake)); r.post('/learner/init-graph', wrap(c.initialize));
  r.post('/profile/path/upgrade',wrap(c.upgrade));
  r.post('/remediation/review',wrap(c.reviewRemediation));
  r.get('/nodes/:id', wrap(c.node)); r.post('/recommendation', wrap(c.recommend));
  r.post('/tutor/fast', wrap(c.tutor)); r.delete('/profile/path', wrap(c.reset));
  return r;
}
