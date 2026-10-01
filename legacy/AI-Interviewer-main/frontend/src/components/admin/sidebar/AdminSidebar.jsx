/**
 * components/admin/sidebar/AdminSidebar.jsx
 *
 * The main admin sidebar.
 * Features:
 *  - Grouped navigation (Main, AI Tools, Finance, System)
 *  - Collapsible (icon-only) mode on desktop
 *  - Animated active state with gradient highlight
 *  - Shows role badge (Super Admin crown / Admin)
 *  - Tooltip on collapsed mode
 *
 * Props:
 *  collapsed    — boolean  — whether sidebar is in icon-only mode
 *  onNavClick   — fn       — called on mobile nav click (to close drawer)
 */

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Briefcase, MessageSquare, FileText,
  Target, CreditCard, DollarSign, BarChart2, Settings,
  Shield, Crown, LogOut, RefreshCw, Terminal,
} from 'lucide-react';
import { useAdminAuth } from '@/context';

// ─── Navigation Config ───────────────────────────────────────────
// Grouped into logical sections for visual clarity
const NAV_GROUPS = [
  {
    label: 'Main',
    items: [
      { to: '/admin',            label: 'Dashboard',    icon: LayoutDashboard, end: true },
      { to: '/admin/users',      label: 'Users',         icon: Users,           permission: 'view:users' },
      { to: '/admin/jobs',       label: 'Jobs',          icon: Briefcase,       permission: 'view:jobs' },
      { to: '/admin/interviews', label: 'Interviews',    icon: MessageSquare,   permission: 'view:templates' },
      { to: '/admin/resumes',    label: 'Resumes',       icon: FileText,        permission: 'view:users' },
    ],
  },
  {
    label: 'AI Tools',
    items: [
      { to: '/admin/ats',        label: 'ATS',           icon: Target,          permission: 'view:templates' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/admin/subscription', label: 'Subscription', icon: CreditCard,       permission: 'view:settings' },
      { to: '/admin/payments',     label: 'Payments',     icon: DollarSign,       permission: 'view:payments' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/scraper',    label: 'Job Scraper',  icon: RefreshCw,       permission: 'view:scraper' },
      { to: '/admin/prompts',    label: 'Prompt Editor',icon: FileText,        permission: 'view:prompts' },
      { to: '/admin/logs',       label: 'System Logs',  icon: Terminal,        permission: 'view:logs' },
      { to: '/admin/analytics',  label: 'Analytics',    icon: BarChart2,       permission: 'view:analytics' },
      { to: '/admin/settings',   label: 'Settings',     icon: Settings,        permission: 'view:settings' },
    ],
  },
];

// ─── Single Nav Item ──────────────────────────────────────────────
function NavItem({ to, label, icon: Icon, end, collapsed, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
         transition-all duration-200 group select-none
         ${collapsed ? 'justify-center' : ''}
         ${isActive
           ? 'bg-gradient-to-r from-red-600/25 to-orange-500/15 text-white border border-red-500/25 shadow-sm shadow-red-500/10'
           : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
         }`
      }
    >
      {({ isActive }) => (
        <>
          {/* Active left bar accent */}
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-red-400 rounded-r-full" />
          )}
          <Icon
            size={17}
            className={`flex-shrink-0 transition-transform duration-200
              ${isActive ? 'text-red-400' : 'group-hover:scale-110'}`}
          />
          {!collapsed && (
            <span className="truncate">{label}</span>
          )}
          {/* Tooltip on collapsed */}
          {collapsed && (
            <div className="
              absolute left-full ml-2 px-2.5 py-1.5 rounded-lg
              bg-[#1e1e35] border border-white/10 text-white text-xs font-medium
              pointer-events-none opacity-0 group-hover:opacity-100
              transition-opacity duration-150 whitespace-nowrap z-50
            ">
              {label}
            </div>
          )}
        </>
      )}
    </NavLink>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────
export default function AdminSidebar({ collapsed, onNavClick }) {
  const { admin, isSuperAdmin, adminLogout, hasPermission } = useAdminAuth();

  const handleLogout = async () => {
    await adminLogout();
    window.location.href = '/admin/login';
  };

  // Filter navigation groups based on permission map
  const visibleGroups = NAV_GROUPS.map((group) => {
    const items = group.items.filter((item) => {
      if (!item.permission) return true;
      return hasPermission(item.permission);
    });
    return { ...group, items };
  }).filter((group) => group.items.length > 0);

  return (
    <div className="flex flex-col h-full">

      {/* ── Brand / Logo ─────────────────────────────────────── */}
      <div className={`flex items-center gap-3 px-4 h-16 border-b border-white/[0.07] flex-shrink-0 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-red-500/20">
          <Shield size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight">AI Interviewer</p>
            <div className="flex items-center gap-1 mt-0.5">
              {isSuperAdmin ? (
                <>
                  <Crown size={9} className="text-amber-400" />
                  <span className="text-amber-400 text-[10px] font-semibold">Super Admin</span>
                </>
              ) : (
                <span className="text-red-400 text-[10px] font-semibold">Admin Panel</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {visibleGroups.map((group) => (
          <div key={group.label}>
            {/* Group label — hidden when collapsed */}
            {!collapsed && (
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                {group.label}
              </p>
            )}
            {/* Divider when collapsed */}
            {collapsed && (
              <div className="border-t border-white/[0.06] mb-1" />
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem
                  key={item.to}
                  {...item}
                  collapsed={collapsed}
                  onClick={onNavClick}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Admin Profile + Logout ───────────────────────────── */}
      <div className="border-t border-white/[0.07] p-2 flex-shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-3 py-2 mb-1 rounded-xl bg-white/[0.03]">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {admin?.name?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{admin?.name ?? 'Admin'}</p>
              <p className="text-slate-500 text-[10px] truncate">{admin?.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Logout' : undefined}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl
            text-slate-500 hover:text-red-400 hover:bg-red-500/10
            text-sm font-medium transition-all duration-200 group
            ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={16} className="flex-shrink-0 group-hover:scale-110 transition-transform" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}
