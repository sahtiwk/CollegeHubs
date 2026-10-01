/**
 * pages/admin/AdminLoginPage.jsx
 *
 * Dedicated admin login page at /admin/login.
 * Uses AdminAuthContext (not user auth) to authenticate.
 * On success, redirects to /admin dashboard.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useAdminAuth } from '@/context';

export default function AdminLoginPage() {
  const navigate                = useNavigate();
  const { adminLogin, isLoading, error, clearError, isAdminAuthenticated } = useAdminAuth();

  const [form, setForm]           = useState({ email: '', password: '' });
  const [showPass, setShowPass]   = useState(false);
  const [formError, setFormError] = useState('');

  // If already authenticated, redirect immediately
  useEffect(() => {
    if (isAdminAuthenticated) navigate('/admin', { replace: true });
  }, [isAdminAuthenticated, navigate]);

  // Sync context error to local display
  useEffect(() => {
    if (error) setFormError(error);
  }, [error]);

  const handleChange = (e) => {
    setFormError('');
    clearError();
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.email.trim())    return setFormError('Email is required.');
    if (!form.password.trim()) return setFormError('Password is required.');

    const result = await adminLogin({ email: form.email.trim(), password: form.password });

    if (result.success) {
      navigate('/admin', { replace: true });
    } else {
      setFormError(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070f] flex items-center justify-center p-4 relative overflow-hidden">

      {/* Background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-red-600/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-orange-600/6 rounded-full blur-[100px] pointer-events-none" />

      {/* Card */}
      <div className="relative w-full max-w-md">

        {/* Top badge */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20">
            <Shield size={14} className="text-red-400" />
            <span className="text-red-300 text-xs font-semibold tracking-wide uppercase">Admin Access Only</span>
          </div>
        </div>

        {/* Login card */}
        <div className="bg-[#0f0f1e]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">

          {/* Logo / Title */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/20">
              <Shield size={26} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">Sign in with your admin credentials</p>
          </div>

          {/* Error banner */}
          {formError && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-5">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{formError}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" id="admin-login-form">

            {/* Email */}
            <div>
              <label htmlFor="admin-email" className="form-label">Admin Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  id="admin-email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="aftab@admin.com"
                  className="form-input pl-10"
                  autoComplete="email"
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="admin-password" className="form-label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  id="admin-password"
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter admin password"
                  className="form-input pl-10 pr-10"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="admin-login-btn"
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl
                         bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold text-sm
                         shadow-lg shadow-red-500/20 hover:from-red-500 hover:to-orange-500
                         active:scale-95 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Authenticating…
                </>
              ) : (
                <>
                  <Shield size={16} />
                  Sign In as Admin
                </>
              )}
            </button>
          </form>

          {/* Security notice */}
          <p className="text-center text-slate-600 text-xs mt-6">
            This panel is restricted to authorized administrators only.
            <br />Unauthorized access is monitored and logged.
          </p>
        </div>

        {/* Back to main site */}
        <p className="text-center mt-4">
          <a href="/" className="text-slate-500 text-xs hover:text-slate-300 transition-colors">
            ← Back to main site
          </a>
        </p>
      </div>
    </div>
  );
}
