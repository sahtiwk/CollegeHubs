/**
 * lib/adminAxios.js
 *
 * Dedicated Axios instance for admin API calls.
 * Completely separate from the user axios (lib/axios.js) to prevent
 * token mixing between admin and regular user sessions.
 *
 * Features:
 *  - Reads admin token from 'ai-admin-auth' localStorage key
 *  - Auto-refresh on 401 using admin refresh token
 *  - Dispatches 'admin:logout' event on refresh failure
 *  - Request queue: concurrent 401s wait for a single refresh
 */

import axios from 'axios';

const STORAGE_KEY = 'ai-admin-auth';
const BASE_URL    = import.meta.env.VITE_API_URL || '/api';

// ─── Axios Instance ───────────────────────────────────────────────
const adminApi = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Helper: read admin auth from localStorage ────────────────────
export const getAdminAuth = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

// ─── Helper: update access token in localStorage ──────────────────
export const setAdminAccessToken = (token) => {
  try {
    const current = getAdminAuth();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, accessToken: token }));
  } catch { /* ignore */ }
};

// ─── Helper: clear admin auth from localStorage ───────────────────
export const clearAdminAuth = () => {
  localStorage.removeItem(STORAGE_KEY);
};

// ─── Request Interceptor: attach Bearer token ─────────────────────
adminApi.interceptors.request.use(
  (config) => {
    const { accessToken } = getAdminAuth();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: auto-refresh on 401 ───────────────────
let isRefreshing = false;
let failedQueue  = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

adminApi.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Queue concurrent requests while refreshing
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return adminApi(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const { refreshToken } = getAdminAuth();

    if (!refreshToken) {
      clearAdminAuth();
      window.dispatchEvent(new Event('admin:logout'));
      isRefreshing = false;
      return Promise.reject(error);
    }

    try {
      const { data } = await axios.post(`${BASE_URL}/admin/auth/refresh`, { refreshToken });
      const newToken = data.accessToken;

      setAdminAccessToken(newToken);
      processQueue(null, newToken);
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return adminApi(originalRequest);

    } catch (refreshError) {
      processQueue(refreshError, null);
      clearAdminAuth();
      window.dispatchEvent(new Event('admin:logout'));
      return Promise.reject(refreshError);

    } finally {
      isRefreshing = false;
    }
  }
);

export default adminApi;
