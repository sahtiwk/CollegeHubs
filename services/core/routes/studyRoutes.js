const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const study = require('../services/studyService');
router.use(authenticate);
const route = (fn, status = 200, publish = false) => async (req, res) => {
  try {
    const result = await fn(req);
    res.status(status).json(result);
    if (publish) void req.app.locals.publishStudy?.({ roomId: result.room._id, hubId: result.room.hubId });
  } catch (error) {
    if (error.status === 429) res.set('Retry-After', '1');
    res.status(error.status || 503).json(study.errorDto(error));
  }
};
router.get('/problems', route(req => { study.fields(req.query, []); return study.problems(req.auth); }));
router.get('/time', route(req => { study.fields(req.query, []); return study.time(req.auth); }));
router.get('/', route(req => study.list(req.auth, req.query)));
router.post('/', route(req => study.create(req.auth, req.body), 201));
router.get('/:id', route(req => { study.fields(req.query, []); return study.snapshot(req.auth, req.params.id); }));
router.get('/:id/reviews', route(req => { study.fields(req.query, []); return study.reviews(req.auth, req.params.id); }));
router.post('/:id/reviews', route(req => study.review(req.auth, req.params.id, req.body), 200, true));
router.get('/:id/submissions', route(req => { study.fields(req.query, []); return study.submissions(req.auth, req.params.id); }));
for (const [path, method] of [['join', 'join'], ['start', 'start'], ['draft', 'save'], ['submit', 'submit']]) {
  router.post('/:id/' + path, route(req => study[method](req.auth, req.params.id, req.body), 200, true));
}
module.exports = router;
