const { Router } = require('express');
const { fail } = require('./errors');
const { wrap, cookie } = require('./auth/sessionRoutes');
const idPattern = /^[a-f0-9]{24}$/;
function routes(connection, models, store, practice, ai) {
  const router = Router();
  const authenticated = (req, res, next) => Promise.resolve().then(async () => { req.identity = await store.get(cookie(req, 'session')); req.scope = { userId: req.identity.user_id, hubId: req.identity.hub_id }; if (!['GET', 'HEAD'].includes(req.method)) store.mutation(req.identity, req.get('Origin'), req.get('X-CSRF-Token')); }).then(() => next(), next);
  const owned = async (model, req, session, selection = '') => { if (!idPattern.test(req.params.id || '')) throw fail(404, 'NOT_FOUND'); const row = await model.findOne({ ...req.scope, _id: req.params.id }).select(selection).session(session || null); if (!row) throw fail(404, 'NOT_FOUND'); return row; };
  const resumes = require('./controllers/resume.controller')(connection, models, owned);
  router.get('/resumes', authenticated, wrap(resumes.list));
  router.post('/resumes/upload', authenticated, require('./middleware/upload.middleware')(), wrap(resumes.upload));
  router.get('/resumes/:id', authenticated, wrap(resumes.get));
  router.delete('/resumes/:id', authenticated, wrap(resumes.delete));
  router.get('/capabilities', authenticated, (_req,res) => res.json({ aiAvailable: ai.enabled, provider: process.env.NODE_ENV === 'test' && process.env.INTERVIEW_PROVIDER_FIXTURE === 'true' ? 'Synthetic test provider' : 'Groq', model: ai.model }));
  router.get('/interviews', authenticated, wrap(async (req,res) => res.json(await practice.listInterviews(req.identity))));
  router.post('/interviews', authenticated, wrap(async (req,res) => res.status(201).json({ interview: await practice.create(req.identity,req.body) })));
  router.get('/interviews/:id', authenticated, wrap(async (req,res) => res.json({ interview: await practice.readInterview(req.identity,req.params.id) })));
  router.delete('/interviews/:id', authenticated, wrap(async (req,res) => res.json(await practice.removeInterview(req.identity,req.params.id))));
  router.post('/interviews/:id/generate', authenticated, wrap(async (req,res) => { const interview = await practice.generate(req.identity,req.params.id,req.body); res.status(interview.status === 'generating' ? 202 : 200).json({interview}); }));
  router.get('/sessions', authenticated, wrap(async (req,res) => res.json(await practice.history(req.identity))));
  router.post('/sessions', authenticated, wrap(async (req,res) => res.status(201).json({session:await practice.start(req.identity,req.body)})));
  router.get('/sessions/:id', authenticated, wrap(async (req,res) => res.json({session:await practice.readSession(req.identity,req.params.id)})));
  router.put('/sessions/:id/answers/:questionId', authenticated, wrap(async (req,res) => res.json({session:await practice.saveAnswer(req.identity,req.params.id,req.params.questionId,req.body)})));
  router.post('/sessions/:id/complete', authenticated, wrap(async (req,res) => { const session=await practice.complete(req.identity,req.params.id,req.body);res.status(session.status === 'evaluating' ? 202 : 200).json({session}); }));
  return router;
}
module.exports = { routes };
