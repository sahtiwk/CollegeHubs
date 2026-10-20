import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import api, { renewSession, getAccessToken, getSessionKey, getSessionUser } from '../api';
import { useLocation } from 'react-router-dom';
import { isPublicRoute } from './publicRoutes';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const publicPage = isPublicRoute(useLocation().pathname);
  const [state, setState] = useState({ user: null, loading: true, error: '', privateReady: false });
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const run = ++generation.current;
    if (publicPage) { setState({ user: getSessionUser(), loading: false, error: '', privateReady: false }); return; }
    try {
      await renewSession();
      if (run !== generation.current) return;
      const key = getSessionKey();
      if (!getAccessToken()) { setState({ user: null, loading: false, error: '', privateReady: true }); return; }
      const { data } = await api.get('/me');
      if (run === generation.current && key === getSessionKey()) setState({ user: data, loading: false, error: '', privateReady: true });
    } catch (error) {
      if (run === generation.current) setState(old => old.user ? { ...old, loading: false } : { user: null, loading: false, error: 'Unable to restore your account. Please retry.', privateReady: true });
    }
  }, [publicPage]);
  useEffect(() => {
    const identity = () => { generation.current++; setState({ user: null, loading: !!getSessionUser(), error: '', privateReady: !getSessionUser() }); };
    const change = () => {
      if (!getSessionUser()) { generation.current++; setState({ user: null, loading: false, error: '', privateReady: true }); }
      else void refresh();
    };
    void refresh(); window.addEventListener('core-session', change); window.addEventListener('core-identity', identity);
    return () => { generation.current++; window.removeEventListener('core-session', change); window.removeEventListener('core-identity', identity); };
  }, [refresh]);
  return <AuthContext.Provider value={{ ...state, loading: state.loading || (!publicPage && !state.privateReady), refresh }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
