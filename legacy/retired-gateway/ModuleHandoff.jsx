import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';
const modules = { arcade: 'Arcade', interview: 'Interview', learn: 'Learn' };
export default function ModuleHandoff() {
  const [params] = useSearchParams();
  const module = params.get('module');
  const state = params.get('state');
  const returnPath = params.get('returnPath');
  const valid = Object.hasOwn(modules, module) && /^[a-zA-Z0-9_-]{43}$/.test(state || '') &&
    ['/' + module, '/' + module + '/'].includes(returnPath) &&
    [...params.keys()].length === 3 && ['module', 'state', 'returnPath'].every(key => params.getAll(key).length === 1);
  const key = JSON.stringify([module, state, returnPath]);
  const request = useRef(null);
  const [result, setResult] = useState(null);
  useEffect(() => {
    if (!valid) return;
    let active = true;
    // Reuse the pending request across StrictMode effects, never across handoff states.
    if (request.current?.key !== key) request.current = { key, promise: api.post('/auth/module-grants', { module, state, returnPath }) };
    request.current.promise.then(({ data }) => {
      if (data.callbackPath !== '/' + module + '/auth/callback' || !/^[a-zA-Z0-9_-]{43}$/.test(data.grant || '')) throw new Error('Invalid handoff response');
      if (active) setResult({ key, data });
    }).catch(err => {
      if (active) setResult({ key, error: err.response?.data?.error?.message || 'Unable to open this module. Return to your Hub and try again.' });
    });
    return () => { active = false; };
  }, [valid, key, module, state, returnPath]);
  const current = result?.key === key ? result : null;
  return <main className="status-page stack">
    <p className="eyebrow">CollegeHubs</p><h1>{valid ? 'Continue to ' + modules[module] + '.' : 'Start from your Hub.'}</h1>
    <p>{valid ? 'Take your college identity with you. No separate account is needed.' : 'This module handoff is incomplete or invalid. Open the module from your Hub.'}</p>
    {current?.error && <p role="alert" className="error">{current.error}</p>}
    {valid && !current && <p role="status">Preparing your connection...</p>}
    {current?.data && <form method="post" action={current.data.callbackPath}>
      <input type="hidden" name="module" value={module} />
      <input type="hidden" name="state" value={state} />
      <input type="hidden" name="grant" value={current.data.grant} />
      <button className="primary" type="submit">Continue to {modules[module]}</button>
    </form>}
    <Link to="/">Back to your Hub</Link>
  </main>;
}
