/**
 * services/auth.service.js
 *
 * All authentication-related API calls.
 * Returns the raw response data — no Redux/Context awareness here.
 *
 * Called by: AuthContext actions
 */

import api from '@/lib/axios';

export const authService = {
  /**
   * Register a new user
   * @param {{ name: string, email: string, password: string }} userData
   * @returns {{ user, accessToken, refreshToken }}
   */
  register: async (userData) => {
    const { data } = await api.post('/auth/register', userData);
    return data;
  },

  /**
   * Login with credentials
   * @param {{ email: string, password: string }} credentials
   * @returns {{ user, accessToken, refreshToken }}
   */
  login: async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    return data;
  },

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken
   * @returns {{ accessToken: string }}
   */
  refreshToken: async (refreshToken) => {
    const { data } = await api.post('/auth/refresh', { refreshToken });
    return data;
  },

  /**
   * Get currently authenticated user
   * @returns {{ user }}
   */
  getMe: async () => {
    const { data } = await api.get('/auth/me');
    return data;
  },

  /**
   * Logout (server-side invalidation if needed)
   */
  logout: async () => {
    await api.post('/auth/logout');
  },
};
