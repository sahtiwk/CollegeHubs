const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const answers = require('../services/answerService');
const { errorDto } = require('../services/messageService');
router.use(authenticate);
router.get('/:id/thread', async (req, res) => {
  try { res.json(await answers.thread(req.auth, req.params.id, req.query)); }
  catch (error) { res.status(error.status || 503).json(errorDto(error)); }
});
router.post('/:id/accepted-answer', async (req, res) => {
  try {
    const result = await answers.accept(req.auth, req.params.id, req.body);
    if (!result.duplicate) req.app.locals.publishMessage?.(result.question, 'message:updated');
    res.json(result);
  } catch (error) { res.status(error.status || 503).json(errorDto(error)); }
});
module.exports = router;
