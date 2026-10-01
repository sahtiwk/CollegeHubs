/**
 * components/admin/topbar/NotificationDropdown.jsx
 *
 * Notification bell icon with a dropdown panel.
 * Features:
 *  - Bell icon with unread count badge
 *  - Dropdown with notification items (type, message, time)
 *  - "Mark all read" action
 *  - Closes on outside click (via useRef + useEffect)
 *
 * In Phase 2, notifications are static demo data.
 * In a later phase, replace with a real-time API call.
 */

import { useState, useRef, useEffect } from 'react';
import { Bell, Users, Briefcase, AlertCircle, CheckCheck, X } from 'lucide-react';

// Demo notifications — replace with API call in a later phase
const DEMO_NOTIFICATIONS = [
  {
    id: 1,
    type: 'user',
    icon: Users,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
    title: 'New user registered',
    message: 'sarah.dev@gmail.com just signed up',
    time: '2 min ago',
    read: false,
  },
  {
    id: 2,
    type: 'interview',
    icon: Briefcase,
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/10',
    title: 'Interview completed',
    message: 'John Doe completed Senior React Developer interview',
    time: '15 min ago',
    read: false,
  },
  {
    id: 3,
    type: 'alert',
    icon: AlertCircle,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10',
    title: 'High session load',
    message: '50+ active interview sessions running',
    time: '1 hr ago',
    read: true,
  },
];

export default function NotificationDropdown() {
  const [open, setOpen]             = useState(false);
  const [notifications, setNotifs]  = useState(DEMO_NOTIFICATIONS);
  const dropdownRef                 = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

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

  const markAllRead = () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const dismiss = (id) => {
    setNotifs((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="relative" ref={dropdownRef}>

      {/* Bell button */}
      <button
        id="admin-notifications-btn"
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 rounded-xl bg-white/5 border border-white/8
                   flex items-center justify-center text-slate-400
                   hover:text-white hover:bg-white/10 hover:border-white/15
                   transition-all duration-200"
        aria-label="Notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full
                           bg-red-500 text-white text-[9px] font-bold
                           flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="
          absolute right-0 top-full mt-2 w-80
          bg-[#12122a] border border-white/10 rounded-2xl shadow-2xl
          overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150
        ">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-slate-400" />
              <span className="text-white text-sm font-semibold">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
              >
                <CheckCheck size={12} />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={24} className="text-slate-700 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No notifications</p>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = n.icon;
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors ${
                      !n.read ? 'bg-white/[0.02]' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg ${n.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon size={14} className={n.iconColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-white text-xs font-semibold truncate">{n.title}</p>
                        {!n.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-slate-500 text-xs mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
                      <p className="text-slate-600 text-[10px] mt-1">{n.time}</p>
                    </div>
                    <button
                      onClick={() => dismiss(n.id)}
                      className="text-slate-700 hover:text-slate-400 transition-colors flex-shrink-0 mt-0.5"
                      aria-label="Dismiss"
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-white/8 text-center">
            <button className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
