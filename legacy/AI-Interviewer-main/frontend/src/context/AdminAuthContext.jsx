/**
 * context/AdminAuthContext.jsx
 *
 * Manages admin authentication state using Context API + useReducer.
 * Completely separate from AuthContext (user auth) — uses its own:
 *   - localStorage key: 'ai-admin-auth'
 *   - Axios instance:   adminAxios (lib/adminAxios.js)
 *   - Event:            'admin:logout'
 *
 * Provides:
 *   admin, accessToken, isAdminAuthenticated, isLoading, adminRole,
 *   adminLogin, adminLogout, isSuperAdmin
 *
 * Usage:
 *   import { useAdminAuth } from '@/context';
 *   const { admin, adminLogin, adminLogout, isSuperAdmin } = useAdminAuth();
 */

import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import adminApi, { clearAdminAuth } from '@/lib/adminAxios';

const STORAGE_KEY = 'ai-admin-auth';

// ─── Initial State ────────────────────────────────────────────────
const initialState = {
  admin:               null,
  accessToken:         null,
  refreshToken:        null,
  isAdminAuthenticated: false,
  isLoading:           true,   // true while restoring from localStorage
  error:               null,
};

// ─── Action Types ─────────────────────────────────────────────────
const ACTIONS = {
  AUTH_SUCCESS: 'AUTH_SUCCESS',
  AUTH_FAILURE: 'AUTH_FAILURE',
  LOGOUT:       'LOGOUT',
  SET_LOADING:  'SET_LOADING',
  CLEAR_ERROR:  'CLEAR_ERROR',
  SET_TOKEN:    'SET_TOKEN',
};

// ─── Reducer ──────────────────────────────────────────────────────
const adminAuthReducer = (state, action) => {
  switch (action.type) {

    case ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload };

    case ACTIONS.AUTH_SUCCESS:
      return {
        ...state,
        admin:               action.payload.admin,
        accessToken:         action.payload.accessToken,
        refreshToken:        action.payload.refreshToken,
        isAdminAuthenticated: true,
        isLoading:           false,
        error:               null,
      };

    case ACTIONS.AUTH_FAILURE:
      return { ...state, error: action.payload, isLoading: false };

    case ACTIONS.LOGOUT:
      return { ...initialState, isLoading: false };

    case ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };

    case ACTIONS.SET_TOKEN:
      return { ...state, accessToken: action.payload };

    default:
      return state;
  }
};

// ─── Context ──────────────────────────────────────────────────────
export const AdminAuthContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────────
export const AdminAuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(adminAuthReducer, initialState);

  // ── Restore admin session from localStorage on mount ──────────
  useEffect(() => {
    const restore = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
          dispatch({ type: ACTIONS.SET_LOADING, payload: false });
          return;
        }
        const { admin, accessToken, refreshToken } = JSON.parse(stored);
        if (admin && accessToken) {
          dispatch({
            type: ACTIONS.AUTH_SUCCESS,
            payload: { admin, accessToken, refreshToken },
          });
        } else {
          dispatch({ type: ACTIONS.SET_LOADING, payload: false });
        }
      } catch {
        clearAdminAuth();
        dispatch({ type: ACTIONS.SET_LOADING, payload: false });
      }
    };
    restore();
  }, []);

  // ── Persist admin auth to localStorage on changes ─────────────
  useEffect(() => {
    if (state.isAdminAuthenticated && state.admin) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        admin:        state.admin,
        accessToken:  state.accessToken,
        refreshToken: state.refreshToken,
      }));
    } else if (!state.isLoading && !state.isAdminAuthenticated) {
      clearAdminAuth();
    }
  }, [state.isAdminAuthenticated, state.admin, state.accessToken, state.isLoading]);

  // ── Listen for forced logout (token refresh failure) ──────────
  useEffect(() => {
    const handleForceLogout = () => {
      dispatch({ type: ACTIONS.LOGOUT });
    };
    window.addEventListener('admin:logout', handleForceLogout);
    return () => window.removeEventListener('admin:logout', handleForceLogout);
  }, []);

  // ─── Actions ──────────────────────────────────────────────────
  const adminLogin = useCallback(async ({ email, password }) => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: true });
    try {
      const { data } = await adminApi.post('/admin/auth/login', { email, password });
      dispatch({
        type: ACTIONS.AUTH_SUCCESS,
        payload: {
          admin:        data.admin,
          accessToken:  data.accessToken,
          refreshToken: data.refreshToken,
        },
      });
      return { success: true, role: data.admin.role };
    } catch (err) {
      const message = err.response?.data?.message || 'Admin login failed';
      dispatch({ type: ACTIONS.AUTH_FAILURE, payload: message });
      return { success: false, message };
    }
  }, []);

  const adminLogout = useCallback(async () => {
    try {
      await adminApi.post('/admin/auth/logout');
    } catch { /* ignore — logout is local-first */ }
    dispatch({ type: ACTIONS.LOGOUT });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_ERROR });
  }, []);

  // ─── Derived helpers ──────────────────────────────────────────
  const adminRole    = state.admin?.role ?? null;
  const isSuperAdmin = adminRole === 'super_admin';
  const isAdmin      = ['admin', 'super_admin', 'support', 'content_manager'].includes(adminRole);

  const FALLBACK_PERMISSIONS = {
    super_admin: ['*'],
    admin: [
      'view:users', 'update:users',
      'view:jobs', 'create:jobs', 'update:jobs', 'delete:jobs',
      'view:templates', 'create:templates', 'update:templates', 'delete:templates',
      'view:payments', 'view:scraper', 'run:scraper',
      'view:prompts', 'update:prompts',
      'view:logs', 'view:analytics', 'view:settings', 'update:settings'
    ],
    content_manager: [
      'view:jobs', 'create:jobs', 'update:jobs', 'delete:jobs',
      'view:templates', 'create:templates', 'update:templates', 'delete:templates',
      'view:scraper', 'run:scraper',
    ],
    support: [
      'view:users', 'update:users',
      'view:payments', 'refund:payments',
      'view:logs',
    ],
  };

  const hasPermission = useCallback((perm) => {
    const role = state.admin?.role;
    if (!role) return false;
    const perms = state.admin?.permissions || FALLBACK_PERMISSIONS[role] || [];
    if (perms.includes('*')) return true; // super admin wildcard override
    return perms.includes(perm);
  }, [state.admin]);

  const value = {
    // State
    admin:               state.admin,
    accessToken:         state.accessToken,
    isAdminAuthenticated: state.isAdminAuthenticated,
    isLoading:           state.isLoading,
    error:               state.error,
    // Derived
    adminRole,
    isSuperAdmin,
    isAdmin,
    hasPermission,
    // Actions
    adminLogin,
    adminLogout,
    clearError,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────
export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used inside <AdminAuthProvider>');
  return ctx;
};
