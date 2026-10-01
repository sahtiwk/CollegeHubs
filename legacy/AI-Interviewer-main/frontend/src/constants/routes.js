/**
 * constants/routes.js
 *
 * Single source of truth for all route paths.
 * Use these constants instead of hardcoding strings in <Link> or navigate().
 *
 * Usage:
 *   import { ROUTES } from '@/constants/routes';
 *   navigate(ROUTES.LOGIN);
 *   <Link to={ROUTES.DASHBOARD} />
 */

export const ROUTES = {
  // Public
  HOME:     '/',

  // Auth
  LOGIN:    '/login',
  REGISTER: '/register',

  // App
  DASHBOARD:          '/dashboard',
  INTERVIEWS:         '/interviews',
  NEW_INTERVIEW:      '/interviews/new',
  INTERVIEW_SESSION:  (id) => `/interviews/${id}/session`,
  SESSION_RESULTS:    (id) => `/sessions/${id}/results`,
  SESSIONS:           '/sessions',
  RESUMES:            '/resumes',
  PROFILE:            '/profile',
};
