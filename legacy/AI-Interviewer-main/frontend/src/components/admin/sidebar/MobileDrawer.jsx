/**
 * components/admin/sidebar/MobileDrawer.jsx
 *
 * Mobile sidebar drawer — slides in from the left on small screens.
 * Features:
 *  - Animated slide-in with backdrop overlay
 *  - Full sidebar content (via AdminSidebar)
 *  - Close button in header
 *  - Closes on backdrop click
 *  - Body scroll lock while open
 *
 * Props:
 *  open    — boolean — whether the drawer is open
 *  onClose — fn      — called to close the drawer
 */

import { useEffect } from 'react';
import { X, Shield } from 'lucide-react';
import AdminSidebar from './AdminSidebar';

export default function MobileDrawer({ open, onClose }) {

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className="
          fixed left-0 top-0 h-full w-64 z-50 lg:hidden
          bg-[#0c0c1d] border-r border-white/[0.07]
          shadow-2xl shadow-black/50
          animate-in slide-in-from-left duration-200
        "
      >
        {/* Drawer header with close button */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Shield size={15} className="text-white" />
            </div>
            <span className="text-white font-bold text-sm">Admin Panel</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center
                       text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Sidebar content (without the brand header — already shown above) */}
        <div className="h-[calc(100%-4rem)] overflow-hidden">
          <AdminSidebar collapsed={false} onNavClick={onClose} />
        </div>
      </aside>
    </>
  );
}
