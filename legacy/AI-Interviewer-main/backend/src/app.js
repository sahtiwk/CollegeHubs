/**
 * app.js — Pure Express application (no server.listen here)
 *
 * Separation of concerns:
 *  - app.js  → Express app, middleware, routes (testable in isolation)
 *  - server.js → HTTP server bootstrap, process event handlers
 */

require('express-async-errors');

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const compression = require('compression');

const connectDB      = require('./config/db');
const errorHandler   = require('./middleware/errorHandler');

// Route Imports
const authRoutes      = require('./routes/auth.routes');
const userRoutes      = require('./routes/user.routes');
const resumeRoutes    = require('./routes/resume.routes');
const interviewRoutes = require('./routes/interview.routes');
const sessionRoutes   = require('./routes/session.routes');
const jobsRoutes      = require('./routes/jobs.routes');
const adminRoutes     = require('./routes/admin.routes');

const app = express();

// ─── Database ──────────────────────────────────────────────────────
connectDB();

// ─── Security Headers ─────────────────────────────────────────────
app.use(helmet());

// ─── Gzip Compression ─────────────────────────────────────────────
// Compresses all JSON/text responses above the threshold.
// Skips already-encoded content (images, pre-gzipped assets).
app.use(compression({
  // Only compress responses larger than this (bytes). Default 1KB.
  threshold: parseInt(process.env.COMPRESSION_THRESHOLD_BYTES, 10) || 1024,
  // zlib compression level: 1 (fast) – 9 (best). 6 = balanced default.
  level: parseInt(process.env.COMPRESSION_LEVEL, 10) || 6,
  filter(req, res) {
    // Honour the caller's opt-out header
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));

// ─── CORS ─────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    const allowed = process.env.CLIENT_URL || 'http://localhost:5173';
    // Let local dev and exact matches through instantly
    if (!origin || origin === allowed) return callback(null, true);
    
    // Normalize both for comparison (remove trailing slashes)
    const normalizedOrigin  = origin.replace(/\/$/, '');
    const normalizedAllowed = allowed.replace(/\/$/, '');

    if (normalizedOrigin === normalizedAllowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Rejected origin: ${origin} (Expected: ${allowed})`);
      callback(null, false); // Don't throw error, just deny CORS
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
}));


// ─── Rate Limiting ─────────────────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_MAX)        || 100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
}));

// ─── Body Parsers ──────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── HTTP Request Logger ───────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ─── Health Check ──────────────────────────────────────────────────
app.get('/api/health', (_req, res) =>
  res.status(200).json({ success: true, message: 'OK', timestamp: new Date().toISOString() })
);

// ─── API Routes ────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/users',      userRoutes);
app.use('/api/resumes',    resumeRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/sessions',   sessionRoutes);
app.use('/api/jobs',       jobsRoutes);
app.use('/api/admin',      adminRoutes);

// ─── 404 Catch-all ────────────────────────────────────────────────
app.use('*', (req, res) =>
  res.status(404).json({ success: false, message: `Cannot ${req.method} ${req.originalUrl}` })
);

// ─── Global Error Handler (must be last) ──────────────────────────
app.use(errorHandler);

module.exports = app;
