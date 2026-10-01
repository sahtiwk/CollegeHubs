/**
 * services/admin.service.js
 *
 * All admin API calls use the dedicated adminAxios instance (lib/adminAxios.js)
 * which reads the admin token from 'ai-admin-auth' localStorage — completely
 * separate from the regular user api instance.
 */

import adminApi from '@/lib/adminAxios';

// ── Stats ──────────────────────────────────────────────────────────
export const getAdminStats = () =>
  adminApi.get('/admin/stats').then((r) => r.data.data);

// ── Users ──────────────────────────────────────────────────────────
export const getAdminUsers = (params) =>
  adminApi.get('/admin/users', { params }).then((r) => r.data.data);

export const getAdminUser = (id) =>
  adminApi.get(`/admin/users/${id}`).then((r) => r.data.data);

export const updateAdminUser = (id, payload) =>
  adminApi.patch(`/admin/users/${id}`, payload).then((r) => r.data.user);

export const deleteAdminUser = (id) =>
  adminApi.delete(`/admin/users/${id}`).then((r) => r.data);

export const bulkAdminUsersAction = (action, userIds) =>
  adminApi.post('/admin/users/bulk', { action, userIds }).then((r) => r.data);

// ── Interviews ─────────────────────────────────────────────────────
export const getAdminInterviews = (params) =>
  adminApi.get('/admin/interviews', { params }).then((r) => r.data.data);

export const deleteAdminInterview = (id) =>
  adminApi.delete(`/admin/interviews/${id}`).then((r) => r.data);

// ── Sessions ───────────────────────────────────────────────────────
export const getAdminSessions = (params) =>
  adminApi.get('/admin/sessions', { params }).then((r) => r.data.data);

export const deleteAdminSession = (id) =>
  adminApi.delete(`/admin/sessions/${id}`).then((r) => r.data);

// ── Resumes ────────────────────────────────────────────────────────
export const getAdminResumes = (params) =>
  adminApi.get('/admin/resumes', { params }).then((r) => r.data.data);

export const deleteAdminResume = (id) =>
  adminApi.delete(`/admin/resumes/${id}`).then((r) => r.data);

// ── Jobs ───────────────────────────────────────────────────────────
export const getAdminJobs = (params) =>
  adminApi.get('/admin/jobs', { params }).then((r) => r.data.data);

export const getAdminJobStats = () =>
  adminApi.get('/admin/jobs/stats').then((r) => r.data.data);

export const getAdminJob = (id) =>
  adminApi.get(`/admin/jobs/${id}`).then((r) => r.data.job);

export const createAdminJob = (payload) =>
  adminApi.post('/admin/jobs', payload).then((r) => r.data);

export const updateAdminJob = (id, payload) =>
  adminApi.patch(`/admin/jobs/${id}`, payload).then((r) => r.data.job);

export const deleteAdminJob = (id) =>
  adminApi.delete(`/admin/jobs/${id}`).then((r) => r.data);

export const bulkAdminJobsAction = (action, jobIds) =>
  adminApi.post('/admin/jobs/bulk', { action, jobIds }).then((r) => r.data);

// ── Scraper ────────────────────────────────────────────────────────
export const getAdminScraperStatus = () =>
  adminApi.get('/admin/scraper/status').then((r) => r.data);

export const updateAdminScraperSettings = (payload) =>
  adminApi.patch('/admin/scraper/settings', payload).then((r) => r.data.config);

export const triggerAdminScrape = () =>
  adminApi.post('/admin/scraper/run').then((r) => r.data);

export const pauseAdminScraper = () =>
  adminApi.post('/admin/scraper/pause').then((r) => r.data);

export const resumeAdminScraper = () =>
  adminApi.post('/admin/scraper/resume').then((r) => r.data);

export const getAdminScraperLogs = (params) =>
  adminApi.get('/admin/scraper/logs', { params }).then((r) => r.data.data);

// ── Templates ──────────────────────────────────────────────────────
export const getAdminTemplates = (params) =>
  adminApi.get('/admin/templates', { params }).then((r) => r.data.data);

export const getAdminTemplate = (id) =>
  adminApi.get(`/admin/templates/${id}`).then((r) => r.data.template);

export const createAdminTemplate = (payload) =>
  adminApi.post('/admin/templates', payload).then((r) => r.data);

export const updateAdminTemplate = (id, payload) =>
  adminApi.patch(`/admin/templates/${id}`, payload).then((r) => r.data.template);

export const deleteAdminTemplate = (id) =>
  adminApi.delete(`/admin/templates/${id}`).then((r) => r.data);

// ── Prompts ────────────────────────────────────────────────────────
export const getAdminPrompts = () =>
  adminApi.get('/admin/prompts').then((r) => r.data.data);

export const getAdminPrompt = (id) =>
  adminApi.get(`/admin/prompts/${id}`).then((r) => r.data.prompt);

export const updateAdminPrompt = (id, payload) =>
  adminApi.patch(`/admin/prompts/${id}`, payload).then((r) => r.data.prompt);

export const restoreAdminPromptVersion = (id, targetVersion) =>
  adminApi.post(`/admin/prompts/${id}/restore`, { targetVersion }).then((r) => r.data);

// ── Plans ──────────────────────────────────────────────────────────
export const getAdminPlans = (params) =>
  adminApi.get('/admin/plans', { params }).then((r) => r.data.data);

export const getAdminPlanStats = () =>
  adminApi.get('/admin/plans/stats').then((r) => r.data.data);

export const getAdminPlan = (id) =>
  adminApi.get(`/admin/plans/${id}`).then((r) => r.data.plan);

export const createAdminPlan = (payload) =>
  adminApi.post('/admin/plans', payload).then((r) => r.data);

export const updateAdminPlan = (id, payload) =>
  adminApi.patch(`/admin/plans/${id}`, payload).then((r) => r.data.plan);

export const deleteAdminPlan = (id) =>
  adminApi.delete(`/admin/plans/${id}`).then((r) => r.data);

// ── Payments ───────────────────────────────────────────────────────
export const getAdminTransactions = (params) =>
  adminApi.get('/admin/payments/transactions', { params }).then((r) => r.data.data);

export const getAdminPaymentStats = () =>
  adminApi.get('/admin/payments/stats').then((r) => r.data.data);

export const refundAdminTransaction = (id, reason) =>
  adminApi.post(`/admin/payments/transactions/${id}/refund`, { reason }).then((r) => r.data);

export const getAdminWebhookLogs = (params) =>
  adminApi.get('/admin/payments/webhooks', { params }).then((r) => r.data.data);

// ── Settings ───────────────────────────────────────────────────────
export const getAdminSettings = () =>
  adminApi.get('/admin/settings').then((r) => r.data.settings);

export const saveAdminSettings = (payload) =>
  adminApi.patch('/admin/settings', payload).then((r) => r.data.settings);

// ── Analytics ──────────────────────────────────────────────────────
export const getAdminAnalytics = (params) =>
  adminApi.get('/admin/analytics/stats', { params }).then((r) => r.data);

// ── Logs ───────────────────────────────────────────────────────────
export const getAdminLogs = (params) =>
  adminApi.get('/admin/logs', { params }).then((r) => r.data.data);
