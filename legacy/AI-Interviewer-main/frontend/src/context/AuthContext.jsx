/**
 * context/AuthContext.jsx
 *
 * Manages authentication state globally using Context API + useReducer.
 * Provides: user, accessToken, isAuthenticated, isLoading, login, register, logout
 *
 * Usage in any component:
 *   import { useAuthContext } from '@/context';
 *   const { user, login, logout } = useAuthContext();
 */

import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { authService } from '@/services/auth.service';

// ─── Initial State ────────────────────────────────────────────────
const initialState = {
  user:            null,
  accessToken:     null,
  refreshToken:    null,
  isAuthenticated: false,
  isLoading:       true,   // true while restoring session from storage
  error:           null,
};

// ─── Action Types ─────────────────────────────────────────────────
const AUTH_ACTIONS = {
  AUTH_SUCCESS:   'AUTH_SUCCESS',
  AUTH_FAILURE:   'AUTH_FAILURE',
  LOGOUT:         'LOGOUT',
  SET_LOADING:    'SET_LOADING',
  UPDATE_USER:    'UPDATE_USER',
  SET_TOKEN:      'SET_TOKEN',
  CLEAR_ERROR:    'CLEAR_ERROR',
};

// ─── Reducer ──────────────────────────────────────────────────────
const authReducer = (state, action) => {
  switch (action.type) {

    case AUTH_ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload };

    case AUTH_ACTIONS.AUTH_SUCCESS:
      return {
        ...state,
        user:            action.payload.user,
        accessToken:     action.payload.accessToken,
        refreshToken:    action.payload.refreshToken,
        isAuthenticated: true,
        isLoading:       false,
        error:           null,
      };

    case AUTH_ACTIONS.AUTH_FAILURE:
      return {
        ...state,
        error:     action.payload,
        isLoading: false,
      };

    case AUTH_ACTIONS.LOGOUT:
      return { ...initialState, isLoading: false };

    case AUTH_ACTIONS.UPDATE_USER:
      return { ...state, user: { ...state.user, ...action.payload } };

    case AUTH_ACTIONS.SET_TOKEN:
      return { ...state, accessToken: action.payload };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };

    default:
      return state;
  }
};

// ─── Context ──────────────────────────────────────────────────────
export const AuthContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // ── Restore session on mount ─────────────────────────────────
  useEffect(() => {
    const restore = () => {
      try {
        const stored = localStorage.getItem('ai-interview-auth');
        if (!stored) {
          dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
          return;
        }
        const { user, accessToken, refreshToken } = JSON.parse(stored);
        if (user && accessToken) {
          dispatch({
            type: AUTH_ACTIONS.AUTH_SUCCESS,
            payload: { user, accessToken, refreshToken },
          });
        } else {
          dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        }
      } catch {
        localStorage.removeItem('ai-interview-auth');
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      }
    };
    restore();
  }, []);

  // ── Persist to localStorage whenever auth state changes ──────
  useEffect(() => {
    if (state.isAuthenticated && state.user) {
      localStorage.setItem('ai-interview-auth', JSON.stringify({
        user:         state.user,
        accessToken:  state.accessToken,
        refreshToken: state.refreshToken,
      }));
    } else if (!state.isLoading && !state.isAuthenticated) {
      localStorage.removeItem('ai-interview-auth');
    }
  }, [state.isAuthenticated, state.user, state.accessToken, state.isLoading]);

  // ─── Actions ──────────────────────────────────────────────────
  const login = useCallback(async (credentials) => {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
    try {
      const data = await authService.login(credentials);
      dispatch({ type: AUTH_ACTIONS.AUTH_SUCCESS, payload: data });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      dispatch({ type: AUTH_ACTIONS.AUTH_FAILURE, payload: message });
      return { success: false, message };
    }
  }, []);

  const register = useCallback(async (userData) => {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
    try {
      const data = await authService.register(userData);
      dispatch({ type: AUTH_ACTIONS.AUTH_SUCCESS, payload: data });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';
      dispatch({ type: AUTH_ACTIONS.AUTH_FAILURE, payload: message });
      return { success: false, message };
    }
  }, []);

  const logout = useCallback(() => {
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
  }, []);

  const updateUser = useCallback((updates) => {
    dispatch({ type: AUTH_ACTIONS.UPDATE_USER, payload: updates });
  }, []);

  const setAccessToken = useCallback((token) => {
    dispatch({ type: AUTH_ACTIONS.SET_TOKEN, payload: token });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  }, []);

  const value = {
    // State
    user:            state.user,
    accessToken:     state.accessToken,
    refreshToken:    state.refreshToken,
    isAuthenticated: state.isAuthenticated,
    isLoading:       state.isLoading,
    error:           state.error,
    // Actions
    login,
    register,
    logout,
    updateUser,
    setAccessToken,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ─── Hook ─────────────────────────────────────────────────────────
export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>');
  return ctx;
};
