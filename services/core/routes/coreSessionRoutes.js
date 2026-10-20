const router = require('express').Router();
for (const operation of ['csrf', 'refresh', 'logout', 'logout-all']) {
  router[operation === 'csrf' ? 'get' : 'post']('/' + operation, async (req, res) => {
    try { await require('../services/coreSessionService').handle(req, res, operation); }
    catch (error) { res.status(error.status || 503).json({ code: error.code && error.status ? error.code : 'CORE_SESSION_UNAVAILABLE', error: error.status ? error.message : 'Session service unavailable' }); }
  });
}
module.exports = router;
// Same-origin browser GETs need not carry Origin; JSON POST supplies it for bootstrap.
router.post('/csrf', async (req, res) => {
  try { await require('../services/coreSessionService').handle(req, res, 'csrf'); }
  catch (error) { res.status(error.status || 503).json({ code: error.status ? error.code : 'CORE_SESSION_UNAVAILABLE', error: 'Session bootstrap unavailable' }); }
});
