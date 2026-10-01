/**
 * routes/admin.routes.js
 *
 * Two route groups:
 *  1. /api/admin/auth/*  — Public admin auth (login, refresh, logout, me)
 *  2. /api/admin/*       — Protected admin CRUD (all resources)
 *
 * Uses adminAuth middleware (separate from user auth) so tokens are
 * validated against admin roles independently.
 */

const express = require('express');
const router  = express.Router();

const { protectAdmin, requireSuperAdmin } = require('../middleware/adminAuth.middleware');
const { requirePermission } = require('../middleware/rbac');

const {
  adminLogin,
  adminLogout,
  adminRefreshToken,
  getAdminMe,
} = require('../controllers/adminAuth.controller');

const {
  getStats,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  bulkUserAction,
  getAllInterviews,
  deleteInterview,
  getAllSessions,
  deleteSession,
  getAllResumes,
  deleteResume,
} = require('../controllers/admin.controller');

const {
  createJob,
  getAllJobs,
  getJobStats,
  getJobById,
  updateJob,
  deleteJob,
  bulkJobAction,
} = require('../controllers/adminJob.controller');

const {
  getScraperStatus,
  updateScraperSettings,
  triggerManualScrape,
  pauseScraperScheduler,
  resumeScraperScheduler,
  getScraperLogs,
} = require('../controllers/adminScraper.controller');

const {
  createTemplate,
  getAllTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
} = require('../controllers/adminTemplate.controller');

const {
  getAllPrompts,
  getPromptById,
  updatePrompt,
  restorePromptVersion,
} = require('../controllers/adminPrompt.controller');

const {
  createPlan,
  getAllPlans,
  getPlanStats,
  getPlanById,
  updatePlan,
  deletePlan,
} = require('../controllers/adminPlan.controller');

const {
  getAllTransactions,
  refundTransaction,
  getPaymentStats,
  getWebhookLogs,
} = require('../controllers/adminPayment.controller');

const {
  getSettings,
  saveSettings,
} = require('../controllers/adminSettings.controller');

const {
  getAnalytics,
} = require('../controllers/adminAnalytics.controller');

const {
  getAllLogs,
} = require('../controllers/adminLog.controller');

// ── Admin Auth (public) ───────────────────────────────────────────
// POST /api/admin/auth/login    — Admin login (email + password)
// POST /api/admin/auth/logout   — Admin logout
// POST /api/admin/auth/refresh  — Refresh admin access token
// GET  /api/admin/auth/me       — Get current admin profile
router.post('/auth/login',   adminLogin);
router.post('/auth/logout',  adminLogout);
router.post('/auth/refresh', adminRefreshToken);
router.get('/auth/me',       protectAdmin, getAdminMe);

// ── Protected admin routes (require admin or super_admin role) ─────
router.use(protectAdmin);

// ── Stats ─────────────────────────────────────────────────────────
router.get('/stats', getStats);

// ── Users ─────────────────────────────────────────────────────────
router.get('/users',           getAllUsers);
router.post('/users/bulk',     bulkUserAction);
router.get('/users/:id',       getUserById);
router.patch('/users/:id',     updateUser);
router.delete('/users/:id',    requireSuperAdmin, deleteUser);   // Super Admin only

// ── Jobs ──────────────────────────────────────────────────────────
router.get('/jobs',            getAllJobs);
router.get('/jobs/stats',      getJobStats);
router.post('/jobs',           createJob);
router.post('/jobs/bulk',      bulkJobAction);
router.get('/jobs/:id',        getJobById);
router.patch('/jobs/:id',      updateJob);
router.delete('/jobs/:id',     deleteJob);

// ── Interviews ────────────────────────────────────────────────────
router.get('/interviews',              getAllInterviews);
router.delete('/interviews/:id',       deleteInterview);

// ── Sessions ──────────────────────────────────────────────────────
router.get('/sessions',                getAllSessions);
router.delete('/sessions/:id',         deleteSession);

// ── Resumes ───────────────────────────────────────────────────────
router.get('/resumes',                 getAllResumes);
router.delete('/resumes/:id',          deleteResume);

// ── Scraper Control ───────────────────────────────────────────────
router.get('/scraper/status',          getScraperStatus);
router.patch('/scraper/settings',      requirePermission('update:settings'), updateScraperSettings);
router.post('/scraper/run',            requirePermission('run:scraper'), triggerManualScrape);
router.post('/scraper/pause',          requirePermission('run:scraper'), pauseScraperScheduler);
router.post('/scraper/resume',         requirePermission('run:scraper'), resumeScraperScheduler);
router.get('/scraper/logs',            getScraperLogs);

// ── Interview Templates ───────────────────────────────────────────
router.get('/templates',               getAllTemplates);
router.post('/templates',              requirePermission('create:templates'), createTemplate);
router.get('/templates/:id',           getTemplateById);
router.patch('/templates/:id',         requirePermission('update:templates'), updateTemplate);
router.delete('/templates/:id',        requirePermission('delete:templates'), deleteTemplate);

// ── Prompt Editor Control ─────────────────────────────────────────
router.get('/prompts',                 getAllPrompts);
router.get('/prompts/:id',             getPromptById);
router.patch('/prompts/:id',           requirePermission('update:prompts'), updatePrompt);
router.post('/prompts/:id/restore',    requirePermission('update:prompts'), restorePromptVersion);

// ── Subscription Plans ────────────────────────────────────────────
router.get('/plans',                   getAllPlans);
router.get('/plans/stats',             getPlanStats);
router.post('/plans',                  requirePermission('update:settings'), createPlan);
router.get('/plans/:id',               getPlanById);
router.patch('/plans/:id',             requirePermission('update:settings'), updatePlan);
router.delete('/plans/:id',            requirePermission('update:settings'), deletePlan);

// ── Payment Control ───────────────────────────────────────────────
router.get('/payments/transactions',   getAllTransactions);
router.get('/payments/stats',          getPaymentStats);
router.post('/payments/transactions/:id/refund', requirePermission('refund:payments'), refundTransaction);
router.get('/payments/webhooks',       getWebhookLogs);

// ── Settings Control ──────────────────────────────────────────────
router.get('/settings',                getSettings);
router.patch('/settings',              requirePermission('update:settings'), saveSettings);

// ── Analytics Control ─────────────────────────────────────────────
router.get('/analytics/stats',         getAnalytics);

// ── Audit Log Control ─────────────────────────────────────────────
router.get('/logs',                    getAllLogs);

module.exports = router;
