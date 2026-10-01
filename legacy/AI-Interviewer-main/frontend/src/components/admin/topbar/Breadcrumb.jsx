/**
 * components/admin/topbar/Breadcrumb.jsx
 *
 * Auto-generates breadcrumb trail from the current URL path.
 * Example: /admin/users → Admin > Users
 *
 * Uses useLocation() to read the current path.
 * The first segment is always "Admin" (the root).
 * Each further segment is capitalized and linked.
 */

import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

// Map path segments to display labels
const SEGMENT_LABELS = {
  admin:        'Admin',
  users:        'Users',
  jobs:         'Jobs',
  interviews:   'Interviews',
  sessions:     'Sessions',
  resumes:      'Resumes',
  ats:          'ATS',
  subscription: 'Subscription',
  payments:     'Payments',
  analytics:    'Analytics',
  settings:     'Settings',
};

// Build breadcrumbs from a pathname string
function buildCrumbs(pathname) {
  const segments = pathname.split('/').filter(Boolean); // remove empty strings
  return segments.map((seg, index) => {
    const path  = '/' + segments.slice(0, index + 1).join('/');
    const label = SEGMENT_LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1);
    return { label, path };
  });
}

export default function Breadcrumb() {
  const { pathname } = useLocation();
  const crumbs = buildCrumbs(pathname);

  if (crumbs.length <= 1) {
    // On /admin root — just show Home icon
    return (
      <div className="flex items-center gap-1.5">
        <Home size={14} className="text-slate-500" />
        <span className="text-slate-300 text-sm font-medium">Dashboard</span>
      </div>
    );
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1">
      <Home size={13} className="text-slate-600 flex-shrink-0" />
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.path} className="flex items-center gap-1">
            <ChevronRight size={13} className="text-slate-700 flex-shrink-0" />
            {isLast ? (
              <span className="text-white text-sm font-semibold">{crumb.label}</span>
            ) : (
              <Link
                to={crumb.path}
                className="text-slate-500 text-sm hover:text-slate-300 transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
