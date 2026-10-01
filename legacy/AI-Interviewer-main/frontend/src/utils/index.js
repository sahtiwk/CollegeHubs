/**
 * utils/index.js — Barrel for utility helpers
 *
 * Add utility functions here as needed:
 *   export { formatDate, timeAgo }   from './date';
 *   export { formatScore }           from './score';
 *   export { cn }                    from './classnames';
 */

/**
 * cn — Merge Tailwind class names conditionally (wrapper around clsx)
 * Usage: cn('base-class', isActive && 'active-class', { 'other': flag })
 */
export { clsx as cn } from 'clsx';

/**
 * formatDate — Format a date string to human-readable form
 * @param {string|Date} date
 * @param {Intl.DateTimeFormatOptions} options
 */
export const formatDate = (date, options = { month: 'short', day: 'numeric', year: 'numeric' }) =>
  new Date(date).toLocaleDateString('en-US', options);

/**
 * formatDuration — Convert seconds to MM:SS
 * @param {number} seconds
 */
export const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/**
 * truncate — Truncate a string to a max length
 * @param {string} str
 * @param {number} max
 */
export const truncate = (str, max = 100) =>
  str?.length > max ? `${str.slice(0, max)}...` : str;

/**
 * getScoreColor — Returns a Tailwind text color class based on score (0–100)
 * @param {number} score
 */
export const getScoreColor = (score) => {
  if (score >= 70) return 'text-emerald-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-red-400';
};
