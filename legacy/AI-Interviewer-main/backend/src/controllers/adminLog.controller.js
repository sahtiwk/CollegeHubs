/**
 * controllers/adminLog.controller.js
 *
 * Implements Platform Logging and Audit Controllers:
 *  - Serves paginated logs for Auth, Admin settings changes, AI Groq executions, stripe webhooks, scraper status and email dispatchers.
 *  - Auto-seeds descriptive logs if the audit sheets are empty.
 */

const AuditLog = require('../models/AuditLog.model');
const User     = require('../models/User.model');
const AppError = require('../utils/AppError');

// ─── Self-Healing Mock Logs Seeder ────────────────────────────────
const seedMockLogs = async () => {
  const count = await AuditLog.countDocuments();
  if (count > 0) return;

  const users = await User.find().limit(2);
  const triggerUser = users[0]?._id || null;
  const triggerEmail = users[0]?.email || 'candidate@test.com';

  const mockLogs = [
    {
      category: 'auth',
      action: 'admin_login_success',
      status: 'success',
      userId: triggerUser,
      details: 'Super Admin successfully authenticated from IP 192.168.1.5',
      metadata: { ip: '192.168.1.5', userAgent: 'Chrome/120.0.0.0 (Windows NT 10.0)', method: 'JWT_Login' },
    },
    {
      category: 'auth',
      action: 'candidate_login_failed',
      status: 'failed',
      details: `Failed sign-in attempt for account: ${triggerEmail}. Invalid password.`,
      metadata: { ip: '104.22.4.91', userAgent: 'Firefox/118.0', attemptCount: 1 },
    },
    {
      category: 'admin',
      action: 'system_settings_updated',
      status: 'success',
      userId: triggerUser,
      details: 'Admin settings updated: JWT expiry changed to 7d, AI models adjusted.',
      metadata: { updatedFields: ['general.jwtExpiry', 'ai.model'], updatedBy: 'aftab@admin.com' },
    },
    {
      category: 'ai',
      action: 'groq_completion_success',
      status: 'success',
      userId: triggerUser,
      details: 'Groq Llama-3.3 prompt execution processed for candidate Resume parser.',
      metadata: { model: 'llama-3.3-70b-versatile', latencyMs: 840, promptTokens: 320, completionTokens: 120 },
    },
    {
      category: 'payment',
      action: 'stripe_charge_succeeded',
      status: 'success',
      userId: triggerUser,
      details: 'Stripe payment checkout charge succeeded: $19.99 received.',
      metadata: { provider: 'stripe', eventId: 'evt_stripe_9182', checkoutSession: 'cs_test_A1B2', amountCent: 1999 },
    },
    {
      category: 'scraper',
      action: 'scraper_run_complete',
      status: 'success',
      details: 'Job Scraper scheduler task completed successfully.',
      metadata: { durationSec: 14, jobsImported: 8, jobsUpdated: 1, duplicatesFound: 14 },
    },
    {
      category: 'email',
      action: 'activation_email_sent',
      status: 'success',
      userId: triggerUser,
      details: `Dispatched account verification email successfully to ${triggerEmail}`,
      metadata: { provider: 'nodemailer', template: 'verify_email', trackingId: 'msg_9821a' },
    },
    {
      category: 'admin',
      action: 'candidate_banned',
      status: 'warning',
      userId: triggerUser,
      details: `Candidate user account suspended due to multiple failed audio sessions.`,
      metadata: { suspendedEmail: triggerEmail, triggerReason: 'Session limits exceeded.' },
    },
    {
      category: 'ai',
      action: 'audio_conversion_failed',
      status: 'failed',
      details: 'Audio speech compilation failed. Invalid file encoding stream.',
      metadata: { durationSec: 0, provider: 'openai', error: 'audio_format_unsupported' },
    },
  ];

  await AuditLog.insertMany(mockLogs);
};

// ─── GET /api/admin/logs ───────────────────────────────────────────
exports.getAllLogs = async (req, res) => {
  await seedMockLogs();

  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 12;
  const skip  = (page - 1) * limit;
  const search   = req.query.search || '';
  const category = req.query.category;
  const status   = req.query.status;

  const filter = {};

  if (category && category !== 'all') {
    filter.category = category;
  }
  if (status && status !== 'all') {
    filter.status = status;
  }

  if (search) {
    filter.$or = [
      { action:  { $regex: search, $options: 'i' } },
      { details: { $regex: search, $options: 'i' } }
    ];
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort('-createdAt')
      .skip(skip)
      .limit(limit)
      .populate({ path: 'userId', select: 'name email' }),
    AuditLog.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: { logs, total, page, pages: Math.ceil(total / limit) },
  });
};
