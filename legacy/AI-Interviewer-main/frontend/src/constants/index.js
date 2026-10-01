/**
 * constants/index.js — Barrel for all constants
 */

export * from './routes';

// Experience level options — used in forms and display
export const EXPERIENCE_LEVELS = [
  { value: 'entry',     label: 'Entry Level',  sub: '0–2 years' },
  { value: 'mid',       label: 'Mid Level',    sub: '3–5 years' },
  { value: 'senior',    label: 'Senior',       sub: '5–8 years' },
  { value: 'lead',      label: 'Lead / Staff', sub: '8+ years'  },
  { value: 'executive', label: 'Executive',    sub: 'C-Suite'   },
];

// Question type options
export const QUESTION_TYPES = [
  { value: 'technical',   label: 'Technical'   },
  { value: 'behavioral',  label: 'Behavioral'  },
  { value: 'situational', label: 'Situational' },
  { value: 'hr',          label: 'HR'          },
  { value: 'culture_fit', label: 'Culture Fit' },
];

// Session status display config
export const SESSION_STATUS = {
  started:     { label: 'Started',     cls: 'badge-warning' },
  in_progress: { label: 'In Progress', cls: 'badge-warning' },
  completed:   { label: 'Completed',   cls: 'badge-success' },
  abandoned:   { label: 'Abandoned',   cls: 'badge-danger'  },
};

// Interview status display config
export const INTERVIEW_STATUS = {
  draft:       { label: 'Draft',       cls: 'badge-slate'   },
  ready:       { label: 'Ready',       cls: 'badge-brand'   },
  in_progress: { label: 'In Progress', cls: 'badge-warning' },
  completed:   { label: 'Completed',   cls: 'badge-success' },
};
