/**
 * context/AppContext.jsx
 *
 * Global UI/app-level state that doesn't belong to auth:
 *  - Sidebar open/close
 *  - Global loading overlay
 *  - Toast/notification queue (if not using react-hot-toast directly)
 *  - Theme preference
 *
 * Usage:
 *   import { useAppContext } from '@/context';
 *   const { isSidebarOpen, toggleSidebar } = useAppContext();
 */

import { createContext, useContext, useReducer, useCallback } from 'react';

// ─── Initial State ────────────────────────────────────────────────
const initialState = {
  isSidebarOpen:    false,
  isGlobalLoading:  false,
  theme:            'dark',   // 'dark' | 'light'
};

// ─── Action Types ─────────────────────────────────────────────────
const APP_ACTIONS = {
  TOGGLE_SIDEBAR:       'TOGGLE_SIDEBAR',
  SET_SIDEBAR:          'SET_SIDEBAR',
  SET_GLOBAL_LOADING:   'SET_GLOBAL_LOADING',
  SET_THEME:            'SET_THEME',
};

// ─── Reducer ──────────────────────────────────────────────────────
const appReducer = (state, action) => {
  switch (action.type) {
    case APP_ACTIONS.TOGGLE_SIDEBAR:
      return { ...state, isSidebarOpen: !state.isSidebarOpen };

    case APP_ACTIONS.SET_SIDEBAR:
      return { ...state, isSidebarOpen: action.payload };

    case APP_ACTIONS.SET_GLOBAL_LOADING:
      return { ...state, isGlobalLoading: action.payload };

    case APP_ACTIONS.SET_THEME:
      return { ...state, theme: action.payload };

    default:
      return state;
  }
};

// ─── Context ──────────────────────────────────────────────────────
export const AppContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────────
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const toggleSidebar     = useCallback(() => dispatch({ type: APP_ACTIONS.TOGGLE_SIDEBAR }), []);
  const setSidebar        = useCallback((v) => dispatch({ type: APP_ACTIONS.SET_SIDEBAR, payload: v }), []);
  const setGlobalLoading  = useCallback((v) => dispatch({ type: APP_ACTIONS.SET_GLOBAL_LOADING, payload: v }), []);
  const setTheme          = useCallback((t) => dispatch({ type: APP_ACTIONS.SET_THEME, payload: t }), []);

  const value = {
    ...state,
    toggleSidebar,
    setSidebar,
    setGlobalLoading,
    setTheme,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// ─── Hook ─────────────────────────────────────────────────────────
export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside <AppProvider>');
  return ctx;
};
