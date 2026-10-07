const { Router } = require('express');
const { fail, exact } = require('./errors');
const { wrap, cookie } = require('./auth/sessionRoutes');
const idPattern = /^[a-f0-9]{24}$/;
const draftDto = row => ({ id: String(row._id), resumeId: row.resumeId ? String(row.resumeId) : null, resumeUnavailable: row.resumeUnavailable, jobTitle: row.jobTitle, jobDescription: row.jobDescription, questionTypes: row.questionTypes, questionCount: row.questionCount, status: row.status });
function routes(connection, models, store) {
  const router = Router();
  const authenticated = (req, res, next) => Promise.resolve().then(async () => { req.identity = await store.get(cookie(req, 'session')); req.scope = { userId: req.identity.user_id, hubId: req.identity.hub_id }; if (!['GET', 'HEAD'].includes(req.method)) store.mutation(req.identity, req.get('Origin'), req.get('X-CSRF-Token')); }).then(() => next(), next);
  const owned = async (model, req, session, selection = '') => { if (!idPattern.test(req.params.id || '')) throw fail(404, 'NOT_FOUND'); const row = await model.findOne({ ...req.scope, _id: req.params.id }).select(selection).session(session || null); if (!row) throw fail(404, 'NOT_FOUND'); return row; };
  const resumes = require('./controllers/resume.controller')(connection, models, owned);
  router.get('/resumes', authenticated, wrap(resumes.list));
  router.post('/resumes/upload', authenticated, require('./middleware/upload.middleware')(), wrap(resumes.upload));
  router.get('/resumes/:id', authenticated, wrap(resumes.get));
  router.delete('/resumes/:id', authenticated, wrap(resumes.delete));
  router.get('/interviews', authenticated, wrap(async (req, res) => res.json({ items: (await models.Interview.find(req.scope).sort({ createdAt: -1 }).limit(20)).map(draftDto) })));
  router.post('/interviews', authenticated, wrap(async (req, res) => {
    const b = req.body;
    if (!exact(b, ['resumeId', 'jobTitle', 'jobDescription', 'questionTypes']) || !idPattern.test(b.resumeId) || typeof b.jobTitle !== 'string' || !b.jobTitle.trim() || b.jobTitle.length > 160 || typeof b.jobDescription !== 'string' || !b.jobDescription.trim() || b.jobDescription.length > 5000 || !Array.isArray(b.questionTypes) || !b.questionTypes.length || b.questionTypes.length > 5 || new Set(b.questionTypes).size !== b.questionTypes.length || b.questionTypes.some(v => !['technical', 'behavioral', 'situational', 'system-design', 'coding'].includes(v))) throw fail(400, 'INVALID_DRAFT');
    let row; await connection.transaction(async session => { const resume = await models.Resume.findOneAndUpdate({ ...req.scope, _id: b.resumeId }, { $inc: { referenceVersion: 1 } }, { session }); if (!resume) throw fail(404, 'NOT_FOUND'); if (await models.Interview.countDocuments(req.scope).session(session) >= 20) throw fail(409, 'DRAFT_LIMIT'); [row] = await models.Interview.create([{ ...req.scope, ...b }], { session }); });
    res.status(201).json({ interview: draftDto(row) });
  }));
  router.get('/interviews/:id', authenticated, wrap(async (req, res) => res.json({ interview: draftDto(await owned(models.Interview, req)) })));
  router.delete('/interviews/:id', authenticated, wrap(async (req, res) => { const row = await owned(models.Interview, req); await models.Interview.deleteOne({ ...req.scope, _id: row._id }); res.json({ deleted: true }); }));
  return router;
}
module.exports = { routes };
