import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../auth/AuthProvider';
import { defaultTokens, sanitizeTokens, themeStyle } from '../utils/collegeThemes';
const ThemeContext = createContext(null);
const cache = new Map();
export function HubThemeProvider({ children }) {
  const { user } = useAuth();
  const hubId = user?.hubs?.[0]?.hubId;
  const [state, setState] = useState({ hub: null, error: '', loading: false });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setState(previous => hubId && previous.hub?.hubId === hubId ? { ...previous, error: '', loading: true } : { hub: null, error: '', loading: Boolean(hubId) });
    if (hubId) api.get('/me/hub').then(({ data }) => {
      if (data.hubId !== hubId) throw new Error('Hub identity mismatch');
      const key = hubId + ':' + data.themeVersion;
      const tokens = cache.get(key) || sanitizeTokens(data.tokens);
      // Revalidate on every account/focus refresh; cache is never selected by a display label.
      cache.set(key, tokens);
      if (cache.size > 8) cache.delete(cache.keys().next().value);
      if (active) setState({ hub: { ...data, tokens: cache.get(key) }, loading: false, error: '' });
    }).catch(err => {
      if (active) setState({ hub: null, loading: false, error: err.response?.data?.error || 'College branding is unavailable.' });
    });
    return () => { active = false; };
  }, [hubId, user, retry]);
  const hub = state.hub?.hubId === hubId ? state.hub : null;
  return <ThemeContext.Provider value={{ ...state, hub, retry: () => setRetry(value => value + 1) }}>
    <div className="app-theme" style={themeStyle(hub?.tokens || defaultTokens)}>{children}</div>
  </ThemeContext.Provider>;
}
export const useHubTheme = () => useContext(ThemeContext);
