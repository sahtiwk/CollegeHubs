// Default Vercel safe stop until real staging origins are configured and verified.
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(503).json({ error: { code: 'LEARN_NOT_DEPLOYED', message: 'Learn is unavailable until its gateway deployment is configured.', retryable: false } });
}
