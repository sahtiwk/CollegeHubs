import axios from 'axios';
import { clearIntent, rememberIntent } from './auth/returnIntent';
import { isPublicRoute } from './auth/publicRoutes';

const baseURL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
const options = { baseURL: baseURL.endsWith('/api') ? baseURL : `${baseURL}/api`, timeout: 15000, withCredentials: true };
const transport = axios.create(options);
const api = axios.create(options);
const EPOCH = 'ch_session_boundary'; // Coordination only; never a credential or user DTO.
let token = null, user = null, csrf = null, timer, flight, generation = 0, observed = '';
const marker = () => { try { return localStorage.getItem(EPOCH) || observed; } catch { return observed; } };
observed = marker();
const signedOut = () => observed.startsWith('out:');
try { for (const key of ['socialstream_token', 'socialstream_user', 'user']) localStorage.removeItem(key); } catch { /* Never read legacy credentials even if storage is disabled. */ }
export const getAccessToken = () => token;
export const getSessionUser = () => user;
export const hasSessionHint = () => !!user || marker().startsWith('in:');
export const getSessionKey = () => user ? [user._id, user.hubId, user.membershipVersion, claims(token).sid].join(':') : null;
function claims(value) { try { return JSON.parse(atob(value.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch { return {}; } }
const fresh = () => token && claims(token).exp * 1000 > Date.now() + 30000;
const lock = work => navigator.locks ? navigator.locks.request('collegehubs-core-auth', work) : work();
const changed = () => window.dispatchEvent(new Event('core-session'));
function boundary(state) {
  observed = state + ':' + crypto.randomUUID();
  try { localStorage.setItem(EPOCH, observed); } catch { /* Memory-only use remains available. */ }
}
function clear() {
  generation++; token = user = csrf = null; flight = null; clearTimeout(timer);
  window.dispatchEvent(new Event('core-identity')); changed();
}
function install(data) {
  if (typeof data.token !== 'string' || !claims(data.token).sid || claims(data.token).exp * 1000 <= Date.now() || !data.user?._id) throw new Error('Session support is not enabled. Please contact the administrator.');
  const before = getSessionKey();
  token = data.token; user = data.user; csrf = data.csrfToken || csrf;
  clearTimeout(timer);
  timer = setTimeout(() => { if (!isPublicRoute(window.location.pathname)) void renewSession(true).catch(() => {}); }, Math.max(1000, claims(token).exp * 1000 - Date.now() - 30000));
  if (before !== getSessionKey()) window.dispatchEvent(new Event('core-identity'));
  changed();
}
export function saveSession(data) {
  generation++; boundary('in'); install(data);
}
export async function signIn(path, body) {
  return lock(async () => {
    const { data } = await transport.post(path, body);
    csrf = null; saveSession(data); return data;
  });
}
export function renewSession(force = false) {
  if (!force && fresh()) return Promise.resolve(user);
  if (signedOut()) return Promise.resolve(null);
  if (flight) return flight;
  const run = generation, epoch = marker();
  const current = () => run === generation && epoch === marker();
  const pending = lock(async () => {
    if (!current()) throw new axios.CanceledError('Sign-in changed');
    if (!force && fresh()) return user;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const proof = await transport.post('/auth/csrf', {});
        if (!current()) throw new axios.CanceledError('Sign-in changed');
        const response = await transport.post('/auth/refresh', {}, { headers: { 'X-Core-CSRF': proof.data.csrfToken } });
        if (!current()) throw new axios.CanceledError('Sign-in changed');
        csrf = proof.data.csrfToken; install(response.data); return user;
      } catch (error) {
        if (!current()) throw new axios.CanceledError('Sign-in changed');
        if (error.response?.status === 409 && attempt < 2) { await new Promise(resolve => setTimeout(resolve, 1000)); continue; }
        if (error.response?.status === 401) { clear(); return null; }
        // Temporary outages retain identity and drafts; explicit retry remains available.
        clearTimeout(timer); timer = setTimeout(() => { if (!isPublicRoute(window.location.pathname)) void renewSession(true).catch(() => {}); }, 15000);
        throw error;
      }
    }
  });
  flight = pending;
  pending.finally(() => { if (flight === pending) flight = null; }).catch(() => {});
  return pending;
}
export function logout(reason = '') {
  const oldCsrf = csrf;
  clearIntent(); if (reason === 'expired') rememberIntent(window.location.pathname);
  boundary('out'); clear();
  // Clear UI/modules immediately. Network failure must never hold sign-out hostage.
  const epoch = observed;
  void lock(async () => {
    if (marker() !== epoch) return;
    try {
      const proof = oldCsrf || (await transport.post('/auth/csrf', {}, { timeout: 5000 })).data.csrfToken;
      await transport.post('/auth/logout', {}, { headers: { 'X-Core-CSRF': proof }, timeout: 5000 });
    } catch { /* Independent module cookies expire within 15 minutes. */ }
  });
}
const publicRoute = config => ['/auth/login', '/auth/register', '/google/auth', '/auth/capabilities'].includes(config.url);
api.interceptors.request.use(async config => {
  if (!publicRoute(config)) {
    const before = getSessionKey(), run = generation;
    await renewSession();
    if ((before && before !== getSessionKey()) || run !== generation) throw new axios.CanceledError('Sign-in changed. Your draft is preserved.');
    if (!token) throw new axios.CanceledError('Sign in again. Your draft is preserved.');
    config.headers.Authorization = `Bearer ${token}`;
    config.coreIdentity = getSessionKey();
  }
  return config;
});
api.interceptors.response.use(response => {
  if (response.config.coreIdentity && response.config.coreIdentity !== getSessionKey()) throw new axios.CanceledError('Sign-in changed');
  return response;
}, async error => {
  const config = error.config || {};
  if (error.response?.status === 401 && !publicRoute(config) && error.response?.data?.code !== 'GOOGLE_IDENTITY_INVALID' && config.coreIdentity === getSessionKey()) {
    const sent = config.headers?.Authorization;
    if (!config.coreRetried) {
      if (sent === `Bearer ${token}`) await renewSession(true);
      // Replay reads only. Writes remain explicit with their original IDs/revisions.
      if (token && config.coreIdentity === getSessionKey() && ['get', 'head'].includes(config.method)) return api.request({ ...config, coreRetried: true });
    }
  }
  return Promise.reject(error);
});
window.addEventListener('storage', event => {
  if (event.key !== EPOCH && event.key !== null) return;
  observed = marker(); clear();
  if (!signedOut() && !isPublicRoute(window.location.pathname)) void renewSession().catch(() => {});
});
window.addEventListener('focus', () => { if (!signedOut() && !isPublicRoute(window.location.pathname)) void renewSession().catch(() => {}); });
export default api;
