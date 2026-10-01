import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Save, Loader2, CheckCircle } from 'lucide-react';
import { userAPI } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { name: user?.name || '', email: user?.email || '' },
  });

  const {
    register: regPwd, handleSubmit: handlePwd, watch: watchPwd,
    reset: resetPwd, formState: { errors: pwdErrors }
  } = useForm();
  const newPassword = watchPwd('newPassword');

  const onProfileSave = async (data) => {
    setSaving(true);
    try {
      const { data: res } = await userAPI.updateProfile({ name: data.name });
      updateUser({ name: res.user.name });
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const onPasswordSave = async (data) => {
    setSavingPwd(true);
    try {
      await userAPI.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('Password changed successfully!');
      resetPwd();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password change failed');
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Avatar / Info */}
      <div className="card p-6 flex items-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-gradient-brand flex items-center justify-center text-white font-display font-bold text-3xl flex-shrink-0">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="text-xl font-display font-bold text-white">{user?.name}</h2>
          <p className="text-slate-400 text-sm">{user?.email}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="badge badge-brand capitalize">{user?.role}</span>
            <span className="text-xs text-slate-500">{user?.totalSessions} sessions completed</span>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
        <h3 className="font-semibold text-white mb-5 flex items-center gap-2">
          <User className="w-5 h-5 text-brand-400" /> Personal Information
        </h3>

        <form onSubmit={handleSubmit(onProfileSave)} className="space-y-4">
          <div>
            <label className="form-label">Full Name</label>
            <input type="text" className="form-input"
              {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Min 2 characters' } })} />
            {errors.name && <p className="form-error">{errors.name.message}</p>}
          </div>
          <div>
            <label className="form-label">Email Address</label>
            <input type="email" className="form-input bg-surface-hover opacity-60 cursor-not-allowed"
              disabled {...register('email')} />
            <p className="text-slate-500 text-xs mt-1">Email cannot be changed</p>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Password Form */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-6">
        <h3 className="font-semibold text-white mb-5 flex items-center gap-2">
          <Lock className="w-5 h-5 text-brand-400" /> Change Password
        </h3>

        <form onSubmit={handlePwd(onPasswordSave)} className="space-y-4">
          <div>
            <label className="form-label">Current Password</label>
            <input type="password" className="form-input"
              {...regPwd('currentPassword', { required: 'Current password is required' })} />
            {pwdErrors.currentPassword && <p className="form-error">{pwdErrors.currentPassword.message}</p>}
          </div>
          <div>
            <label className="form-label">New Password</label>
            <input type="password" className="form-input"
              {...regPwd('newPassword', {
                required: 'New password is required',
                minLength: { value: 8, message: 'Min 8 characters' },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                  message: 'Must include uppercase, lowercase, and number',
                },
              })} />
            {pwdErrors.newPassword && <p className="form-error">{pwdErrors.newPassword.message}</p>}
          </div>
          <div>
            <label className="form-label">Confirm New Password</label>
            <input type="password" className="form-input"
              {...regPwd('confirmPassword', {
                required: 'Please confirm password',
                validate: (v) => v === newPassword || 'Passwords do not match',
              })} />
            {pwdErrors.confirmPassword && <p className="form-error">{pwdErrors.confirmPassword.message}</p>}
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={savingPwd} className="btn-primary">
              {savingPwd ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {savingPwd ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Account Info */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-6">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Mail className="w-5 h-5 text-brand-400" /> Account Details
        </h3>
        <div className="space-y-3">
          {[
            { label: 'Member Since', value: new Date(user?.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) },
            { label: 'Account Type', value: user?.role === 'admin' ? 'Administrator' : 'Candidate' },
            { label: 'Total Sessions', value: user?.totalSessions ?? 0 },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center py-2 border-b border-surface-border last:border-0">
              <span className="text-slate-400 text-sm">{label}</span>
              <span className="text-white text-sm font-medium">{value}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
