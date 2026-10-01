const { authenticateService, failure } = require('../services/moduleTokenService');
function serviceError(res, err) {
  const status = err.status || 503;
  return res.status(status).json({ error: { code: err.status ? err.code : 'AURA_UNAVAILABLE',
    message: err.status ? err.message : 'Aura is temporarily unavailable; keep the saved result pending',
    retryable: status === 429 || status === 503 } });
}
async function serviceAuth(req, res, next) {
  try {
    req.service = await authenticateService(req.get('Authorization'));
    if (req.get('Origin') || req.get('Sec-Fetch-Site')) throw failure(403, 'SERVICE_ONLY', 'A server request is required');
    next();
  } catch (err) { serviceError(res, err); }
}
module.exports = { serviceAuth, serviceError };
