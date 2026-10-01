const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const messages = require('../services/messageService');
router.use(authenticate);
router.get('/:id/messages', async (req, res) => {
  try { res.json(await messages.history(req.auth, req.params.id, req.query)); }
  catch (error) { res.status(error.status || 503).json(messages.errorDto(error)); }
});
router.post('/:id/messages', async (req, res) => {
  try {
    const result = await messages.send(req.auth, req.params.id, req.body);
    // The transaction is committed before the HTTP response or best-effort broadcast.
    if (!result.duplicate) req.app.locals.publishMessage?.(result.message);
    res.status(result.duplicate ? 200 : 201).json(result);
  } catch (error) {
    if (error.status === 429) res.set('Retry-After', '60');
    res.status(error.status || 503).json(messages.errorDto(error));
  }
});
module.exports = router;
