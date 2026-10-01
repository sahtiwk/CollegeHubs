/**
 * services/index.js — Barrel for all service modules
 *
 * Usage:
 *   import { authService, interviewService, resumeService } from '@/services';
 */

export { authService }                            from './auth.service';
export { interviewService, sessionService, resumeService, userService } from './interview.service';
