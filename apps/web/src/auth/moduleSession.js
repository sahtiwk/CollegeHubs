import api from '../api';
import { sanitizeTheme } from '../features/learn/hubTheme.ts';
import { moduleUrl } from './moduleUrls.ts';

import { createSessionCoordinator } from './moduleSessionState';
const coordinator = createSessionCoordinator(() => localStorage.getItem('socialstream_token'));
const identity = user => [user?._id, user?.hubId, user?.membershipVersion].join(':');
const expired = dto => !dto || Date.parse(dto.expiresAt) <= Date.now() + 1000;
export async function learnRequest(path, { method = 'GET', body, signal, timeout = 15000, csrf } = {}) {
  if (!['/session', '/auth/start', '/auth/callback', '/logout', '/spike/graph', '/health/ready'].includes(path)) throw new Error('Unknown Learn route');
  const response = await fetch(moduleUrl('/api' + path), { method, credentials: 'same-origin', redirect: 'error', cache: 'no-store',
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(timeout)]) : AbortSignal.timeout(timeout),
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(csrf ? { 'X-CSRF-Token': csrf } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const dto = await response.json();
  if (!response.ok) throw Object.assign(new Error('Learn is temporarily unavailable. Retry when it is ready.'), { status: response.status, code: dto.error?.code });
  return dto;
}
function checked(dto, user) {
  if (dto.userId !== user._id || dto.hubId !== user.hubId || dto.membershipVersion !== user.membershipVersion || expired(dto)) throw Object.assign(new Error('Learn session changed. Start a fresh session.'), { status: 401 });
  sanitizeTheme(dto.theme, dto.hubId, dto.theme.themeVersion);
  return dto;
}
// Never persist a module credential, state, grant or private DTO in browser storage.
export function clearModuleSession({ remote = false } = {}) {
  const old = coordinator.clear();
  if (remote && old?.csrfToken) fetch('/api/learn/logout', { method: 'POST', credentials: 'same-origin', keepalive: true, redirect: 'error', headers: { 'X-CSRF-Token': old.csrfToken } }).catch(() => {});
}
window.addEventListener('core-session', () => clearModuleSession({ remote: true }));
window.addEventListener('storage', event => { if (!event.key || event.key === 'socialstream_token') clearModuleSession({ remote: true }); });

export function ensureLearnSession(user, progress = () => {}) {
  const key = identity(user);
  return coordinator.run(key, async (signal, current) => {
    progress('Waking Learn. Free hosting can take about a minute.');
    // Warm BEFORE issuing the short-lived browser state/Core grant.
    await learnRequest('/health/ready', { signal, timeout: 75000 }); current();
    try { const dto = checked(await learnRequest('/session', { signal }), user); current(); return dto; }
    catch (error) { if (error.status !== 401) throw error; }
    progress('Connecting your college session...');
    const { state } = await learnRequest('/auth/start', { method: 'POST', signal }); current();
    const { data } = await api.post('/auth/module-grants', { module: 'learn', state, returnPath: '/learn' }, { signal }); current();
    if (data.callbackPath !== '/api/learn/auth/callback') throw new Error('Invalid Learn callback');
    await learnRequest('/auth/callback', { method: 'POST', signal, body: { module: 'learn', state, grant: data.grant } }); current();
    const dto = checked(await learnRequest('/session', { signal }), user); current(); return dto;
  });
}
