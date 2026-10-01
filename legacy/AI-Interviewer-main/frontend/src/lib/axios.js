/**
 * lib/axios.js
 *
 * Configured Axios instance:
 *  - Base URL from env
 *  - Request interceptor: attaches Bearer token
 *  - Response interceptor: auto-refresh on 401 with request queue
 *
 * NOTE: reads token from localStorage directly (not context) to avoid
 * circular dependency between this module and AuthContext.
 */

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Helper: read token from Zustand persisted storage ───────────
// Zustand persist wraps state as: { state: { accessToken, ... }, version: 0 }
const getStoredAuth = () => {
  try {
    const raw = localStorage.getItem('ai-interview-auth');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    // Zustand persist format: { state: { ... } }
    return parsed?.state ?? parsed;
  } catch {
    return {};
  }
};

// ─── Request Interceptor ──────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const { accessToken } = getStoredAuth();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: silent token refresh ───────────────────
let isRefreshing = false;
let failedQueue  = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    // Only retry once on 401
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Queue concurrent requests while refresh is in progress
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const { refreshToken } = getStoredAuth();

    if (!refreshToken) {
      // No refresh token — force logout by clearing storage
      localStorage.removeItem('ai-interview-auth');
      window.dispatchEvent(new Event('auth:logout'));
      isRefreshing = false;
      return Promise.reject(error);
    }

    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL || '/api'}/auth/refresh`,
        { refreshToken }
      );

      const newToken = data.accessToken;

      // Update stored token — preserve Zustand persist wrapper { state: { ... } }
      const raw = localStorage.getItem('ai-interview-auth');
      const zustandStore = raw ? JSON.parse(raw) : { state: {} };
      zustandStore.state = { ...zustandStore.state, accessToken: newToken };
      localStorage.setItem('ai-interview-auth', JSON.stringify(zustandStore));


      processQueue(null, newToken);
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);

    } catch (refreshError) {
      processQueue(refreshError, null);
      localStorage.removeItem('ai-interview-auth');
      window.dispatchEvent(new Event('auth:logout'));
      return Promise.reject(refreshError);

    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
