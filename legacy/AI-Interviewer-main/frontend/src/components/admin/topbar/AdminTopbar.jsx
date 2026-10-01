/**
 * components/admin/topbar/AdminTopbar.jsx
 *
 * The top navigation bar of the admin panel.
 * Composed of:
 *  - Left: Mobile hamburger menu + Breadcrumb
 *  - Right: Dark mode toggle + NotificationDropdown + UserMenu
 *
 * Props:
 *  onMenuClick  — fn       — called when hamburger is clicked (mobile)
 *  darkMode     — boolean  — current dark mode state
 *  onDarkToggle — fn       — toggles dark mode
 */

import { Menu, Sun, Moon } from 'lucide-react';
import Breadcrumb            from './Breadcrumb';
import NotificationDropdown  from './NotificationDropdown';
import UserMenu              from './UserMenu';

export default function AdminTopbar({ onMenuClick, darkMode, onDarkToggle }) {
  return (
    <header className="
      flex items-center justify-between
      px-4 lg:px-6 h-16 flex-shrink-0
      bg-[#0c0c1d]/90 backdrop-blur-md
      border-b border-white/[0.07]
    ">

      {/* ── Left section ──────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          id="admin-mobile-menu-btn"
          onClick={onMenuClick}
          className="lg:hidden w-9 h-9 rounded-xl bg-white/5 border border-white/8
                     flex items-center justify-center text-slate-400
                     hover:text-white hover:bg-white/10 transition-all"
          aria-label="Open sidebar"
        >
          <Menu size={18} />
        </button>

        {/* Breadcrumb */}
        <Breadcrumb />
      </div>

      {/* ── Right section ─────────────────────────────────────── */}
      <div className="flex items-center gap-2">

        {/* Dark mode toggle */}
        <button
          id="admin-dark-mode-btn"
          onClick={onDarkToggle}
          className="w-9 h-9 rounded-xl bg-white/5 border border-white/8
                     flex items-center justify-center text-slate-400
                     hover:text-white hover:bg-white/10 hover:border-white/15
                     transition-all duration-200"
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          title={darkMode ? 'Light mode' : 'Dark mode'}
        >
          {darkMode
            ? <Sun size={16} className="text-amber-400" />
            : <Moon size={16} />
          }
        </button>

        {/* Notification bell */}
        <NotificationDropdown />

        {/* User menu */}
        <UserMenu />
      </div>
    </header>
  );
}
