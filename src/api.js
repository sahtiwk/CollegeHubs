import axios from 'axios';

const TOKEN_KEY = 'socialstream_token';
const USER_KEY = 'socialstream_user';
let expiryTimer;

// Client decoding only schedules logout; the server verifies every protected request.
function expiresAt(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload));
    return Number.isFinite(exp) ? exp * 1000 : 0;
  } catch { return 0; }
}

export function logout(reason = '') {
  clearTimeout(expiryTimer);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('user');
  const path = reason === 'expired' ? '/login?reason=expired' : '/login';
  if (window.location.pathname !== '/login' && window.location.pathname !== '/register') window.location.replace(path);
}

function scheduleExpiry(token) {
  clearTimeout(expiryTimer);
  const remaining = expiresAt(token) - Date.now();
  if (remaining <= 0) { logout('expired'); return false; }
  expiryTimer = setTimeout(() => logout('expired'), Math.min(remaining, 2147483647));
  return true;
}

export function saveSession({ token, user }) {
  if (typeof token !== 'string' || expiresAt(token) <= Date.now() || !user?.username) throw new Error('Invalid sign-in response');
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.removeItem('user');
  scheduleExpiry(token);
}

const baseURL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
const api = axios.create({ baseURL: baseURL.endsWith('/api') ? baseURL : `${baseURL}/api`, timeout: 15000 });
const isSignIn = (config) => ['/auth/login', '/auth/register', '/google/auth'].includes(config.url);

api.interceptors.request.use(config => {
  if (!isSignIn(config)) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      if (!scheduleExpiry(token)) return Promise.reject(new Error('Session expired. Please sign in again.'));
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
api.interceptors.response.use(response => response, error => {
  if (error.response?.status === 401 && !isSignIn(error.config || {})) {
    // A late response from an old session must not clear a newly signed-in session.
    const sent = error.config?.headers?.Authorization;
    if (!sent || sent === `Bearer ${localStorage.getItem(TOKEN_KEY)}`) logout('expired');
  }
  return Promise.reject(error);
});

const initialToken = localStorage.getItem(TOKEN_KEY);
if (initialToken) scheduleExpiry(initialToken);
window.addEventListener('storage', event => {
  if (event.key === TOKEN_KEY) {
    if (event.newValue) scheduleExpiry(event.newValue);
    else logout();
  }
});
window.addEventListener('focus', () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) scheduleExpiry(token);
});

export default api;
