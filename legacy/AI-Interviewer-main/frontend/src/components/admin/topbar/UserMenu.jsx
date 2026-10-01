/**
 * components/admin/topbar/UserMenu.jsx
 *
 * Admin user menu dropdown triggered by clicking the avatar.
 * Features:
 *  - Shows admin name, email, role badge
 *  - Quick links: Profile, Settings
 *  - Logout with spinner
 *  - Closes on outside click
 *
 * Reads admin data from AdminAuthContext.
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Settings, LogOut, ChevronDown, Shield, User } from 'lucide-react';
import { useAdminAuth } from '@/context';

export default function UserMenu() {
  const [open, setOpen]         = useState(false);
  const [loggingOut, setLogout] = useState(false);
  const dropdownRef             = useRef(null);
  const navigate                = useNavigate();

  const { admin, isSuperAdmin, adminRole, adminLogout } = useAdminAuth();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setLogout(true);
    await adminLogout();
    navigate('/admin/login');
  };

  const initial = admin?.name?.[0]?.toUpperCase() ?? 'A';

  return (
    <div className="relative" ref={dropdownRef}>

      {/* Trigger button */}
      <button
        id="admin-user-menu-btn"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl
                   bg-white/5 border border-white/8 hover:bg-white/10 hover:border-white/15
                   transition-all duration-200 group"
        aria-label="Admin user menu"
      >
        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-orange-500
                        flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {initial}
        </div>

        {/* Name + role (hidden on small screens) */}
        <div className="hidden sm:block text-left min-w-0">
          <p className="text-white text-xs font-semibold truncate max-w-[100px]">
            {admin?.name ?? 'Admin'}
          </p>
          <p className={`text-[10px] font-medium ${isSuperAdmin ? 'text-amber-400' : 'text-red-400'}`}>
            {isSuperAdmin ? 'Super Admin' : 'Admin'}
          </p>
        </div>

        <ChevronDown
          size={13}
          className={`text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="
          absolute right-0 top-full mt-2 w-60
          bg-[#12122a] border border-white/10 rounded-2xl shadow-2xl
          overflow-hidden z-50
        ">
          {/* Profile header */}
          <div className="px-4 py-4 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500
                              flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate">{admin?.name}</p>
                <p className="text-slate-500 text-xs truncate">{admin?.email}</p>
              </div>
            </div>

            {/* Role badge */}
            <div className="mt-3">
              {isSuperAdmin ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                                 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                  <Crown size={10} />
                  Super Admin
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                                 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
                  <Shield size={10} />
                  Admin
                </span>
              )}
            </div>
          </div>

          {/* Menu items */}
          <div className="p-1.5">
            <button
              onClick={() => { navigate('/admin/settings'); setOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                         text-slate-400 hover:text-white hover:bg-white/5
                         text-sm transition-all duration-150"
            >
              <Settings size={15} />
              Settings
            </button>

            <div className="border-t border-white/8 mt-1 pt-1">
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                           text-slate-400 hover:text-red-400 hover:bg-red-500/10
                           text-sm transition-all duration-150 disabled:opacity-60"
              >
                <LogOut size={15} />
                {loggingOut ? 'Logging out…' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
