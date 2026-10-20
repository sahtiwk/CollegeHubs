import api, { getSessionKey } from '../api';
import { sanitizeTheme } from '../features/learn/hubTheme.ts';
import { moduleUrl } from './moduleUrls.ts';

import { createSessionCoordinator } from './moduleSessionState';
const coordinator = createSessionCoordinator(getSessionKey);
const identity = user => [user?._id, user?.hubId, user?.membershipVersion].join(':');
const expired = dto => !dto || Date.parse(dto.expiresAt) <= Date.now() + 1000;
/** @param {string} path @param {{method?: string, body?: unknown, signal?: AbortSignal, timeout?: number, csrf?: string}} options */
export async function learnRequest(path, { method = 'GET', body, signal, timeout = 15000, csrf } = {}) {
  if (!['/session', '/auth/start', '/auth/callback', '/logout', '/spike/graph', '/health/ready', '/dashboard/graph', '/dashboard/domains', '/dashboard/stats', '/dashboard/milestones', '/onboarding', '/onboarding/profile', '/learner/intake', '/learner/init-graph', '/recommendation', '/tutor/fast', '/profile/preferences', '/profile/path', '/profile/path/upgrade', '/remediation/review', '/quiz/attempts', '/quiz/next', '/quiz/answer', '/quiz/finalize', '/resources'].includes(path) && !/^\/(?:nodes|quiz\/attempts)\/[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(path)) throw new Error('Unknown Learn route');
  const response = await fetch(moduleUrl('/api' + path), { method, credentials: 'same-origin', redirect: 'error', cache: 'no-store',
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(timeout)]) : AbortSignal.timeout(timeout),
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(csrf ? { 'X-CSRF-Token': csrf } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const dto = await response.json();
  if (!response.ok) throw Object.assign(new Error(dto.error?.message || 'Learn is temporarily unavailable. Retry when it is ready.'), { status: response.status, code: dto.error?.code });
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
window.addEventListener('core-identity', () => clearModuleSession({ remote: true }));

/** @param {any} user @param {(message: string) => void} progress */
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
