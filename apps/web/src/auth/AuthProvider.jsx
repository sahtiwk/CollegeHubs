import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import api from '../api';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, loading: true, error: '' });
  const generation = useRef(0);
  const lastToken = useRef(null);
  const refresh = useCallback(async () => {
    const run = ++generation.current;
    const token = localStorage.getItem('socialstream_token');
    const sameSession = token === lastToken.current;
    lastToken.current = token;
    setState(previous => sameSession && previous.user ? previous : { user: null, loading: true, error: '' });
    if (!token) {
      setState({ user: null, loading: false, error: '' }); return;
    }
    try {
      const { data } = await api.get('/me');
      if (run === generation.current) setState({ user: data, loading: false, error: '' });
    } catch (err) {
      if (run === generation.current) setState({ user: null, loading: false, error: err.response?.data?.error || 'Unable to load your account. Please retry.' });
    }
  }, []);
  useEffect(() => {
    refresh();
    const onStorage = event => { if (!event.key || event.key === 'socialstream_token') refresh(); };
    window.addEventListener('core-session', refresh);
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', refresh);
    return () => { generation.current++; window.removeEventListener('core-session', refresh); window.removeEventListener('storage', onStorage); window.removeEventListener('focus', refresh); };
  }, [refresh]);
  return <AuthContext.Provider value={{ ...state, refresh }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
