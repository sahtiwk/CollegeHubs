const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Composition only: importing this module never connects or listens.
function createApp({ connection = mongoose.connection, auraRules = null } = {}) {
  require('./config/auth');
  mongoose.set('bufferCommands', false);
  const app = express();
  const modules = require('./config/modules').moduleConfig();
  // Middleware
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
  if (!allowedOrigins.length || allowedOrigins.some(origin => {
    try { const url = new URL(origin); return !['http:', 'https:'].includes(url.protocol) || url.origin !== origin; }
    catch { return true; }
  })) throw new Error('ALLOWED_ORIGINS must contain exact http(s) origins without paths or wildcards');
  app.use((req, res, next) => {
    if (req.headers.origin && !allowedOrigins.includes(req.headers.origin)) {
      if (req.path === '/api/aura/events') return res.status(403).json({ error: { code: 'ORIGIN_FORBIDDEN', message: 'Origin not allowed', retryable: false } });
      return res.status(403).json({ error: 'Origin not allowed' });
    }
    next();
  });
  app.use(cors({ origin: allowedOrigins, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
  app.use(express.json({ limit: '64kb' }));


  app.get('/health/live', (req, res) => res.json({ status: 'live' }));
  app.get(['/health/ready', '/api/health'], async (req, res) => {
    res.set('Cache-Control', 'no-store');
    let timeout;
    try {
      if (connection.readyState !== 1 || !connection.db) throw new Error('Not connected');
      await Promise.race([
        connection.db.command({ ping: 1 }, { maxTimeMS: 2000 }),
        new Promise((resolve, reject) => { timeout = setTimeout(() => reject(new Error('Ping timed out')), 2500); }),
      ]);
      if (connection.readyState !== 1) throw new Error('Disconnected');
      res.json({ status: 'ready' });
    } catch {
      res.status(503).json({ status: 'unavailable', error: 'Core database unavailable' });
    } finally {
      clearTimeout(timeout);
    }
  });

  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (connection.readyState !== 1) {
      if (req.path === '/aura/events') return res.status(503).json({ error: { code: 'AURA_UNAVAILABLE', message: 'Core database unavailable; retain the pending result', retryable: true } });
      return res.status(503).json({ error: 'Core database unavailable' });
    }
    next();
  });
  // Auth routes
  const authRoutes = require('./routes/authRoutes');
  app.use('/api/auth', authRoutes);
  app.use('/api/auth', require('./routes/moduleAuthRoutes').moduleAuthRoutes(modules));
  app.use('/api/aura', require('./routes/auraEventRoutes').auraEventRoutes({ rules: auraRules }));

  app.use('/api/me', require('./routes/meRoutes'));
  app.use('/api/hubs', require('./routes/hubRoutes'));
  app.use('/api/channels', require('./routes/channelRoutes'));
  app.use('/api/messages', require('./routes/messageRoutes'));
  app.use('/api/study-rooms', require('./routes/studyRoutes'));

  // User routes
  const userRoutes = require('./routes/userRoutes');
  app.use('/api/users', userRoutes);

  // Google auth routes
  const googleAuthRoutes = require('./routes/googleAuthRoutes');
  app.use('/api/google', googleAuthRoutes);

  app.post('/api/google/calendar', (req, res) => {
    res.status(410).json({ error: 'Google Calendar export is disabled' });
  });

  // Post routes
  const postRoutes = require('./routes/postRoutes');
  app.use('/api/posts', postRoutes);

  // API misses must never become an HTML/SPA response at the shared gateway.
  app.use('/api', (_req, res) => res.status(404).json({ error: { code: 'CORE_ROUTE_NOT_FOUND', retryable: false } }));
  app.use((err, req, res, next) => {
    if (req.path === '/api/aura/events') {
      const status = err.type === 'entity.too.large' ? 413 : err.type === 'entity.parse.failed' ? 400 : 503;
      return res.status(status).json({ error: { code: status === 413 ? 'EVENT_TOO_LARGE' : status === 400 ? 'INVALID_JSON' : 'AURA_UNAVAILABLE', message: status === 413 ? 'Event exceeds 64 KiB' : status === 400 ? 'Invalid JSON' : 'Aura unavailable; retain the pending result', retryable: status === 503 } });
    }
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large' });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
    res.status(500).json({ error: 'Server error' });
  });


  return app;
}

module.exports = { createApp };
