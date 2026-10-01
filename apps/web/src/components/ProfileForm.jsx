import React, { useState } from 'react';
import api from '../api';
import { useAuth } from '../auth/AuthProvider';
import { useHubTheme } from '../theme/HubThemeProvider';
const fields = [['fullName', 'Full name', 100], ['bio', 'Bio', 1000], ['leetcodeHandle', 'LeetCode handle', 100], ['codeforcesHandle', 'Codeforces handle', 100], ['githubHandle', 'GitHub handle', 100]];
export default function ProfileForm({ onboarding = false, onClose }) {
  const { user, refresh } = useAuth();
  const { hub } = useHubTheme();
  const [values, setValues] = useState(Object.fromEntries(fields.map(([key]) => [key, user[key] || ''])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (onboarding) await api.put('/users/onboarding', values);
      else await api.patch('/me', values);
      onClose(); await refresh();
    } catch (err) { setError(err.response?.data?.error || 'Unable to save profile. Please retry.'); setBusy(false); }
  }
  return <form className="stack" onSubmit={submit}>
    <p className="muted">College: <strong>{hub?.name || 'Awaiting college assignment'}</strong>. Your college is assigned from your account email.</p>
    {fields.map(([key, label, max]) => <label key={key} htmlFor={'profile-' + key}>{label}
      {key === 'bio' ? <textarea id={'profile-' + key} rows={3} maxLength={max} value={values[key]} onChange={e => setValues({ ...values, [key]: e.target.value })} /> :
        <input id={'profile-' + key} maxLength={max} value={values[key]} onChange={e => setValues({ ...values, [key]: e.target.value })} />}
    </label>)}
    {error && <p role="alert" className="error">{error}</p>}
    <button className="primary" disabled={busy}>{busy ? 'Saving...' : onboarding ? 'Complete profile' : 'Save changes'}</button>
  </form>;
}
