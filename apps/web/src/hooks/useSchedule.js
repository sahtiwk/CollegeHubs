import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import api from '../api';
export function useSchedule(path) {
  const { user } = useAuth(); const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ data: null, error: '', busy: true, key: null });
  const key = user._id + ':' + user.hubId + ':' + path;
  useEffect(() => {
    const controller = new AbortController(); setState({ data: null, error: '', busy: !!path, key });
    if (path) api.get(path, { signal: controller.signal }).then(({ data }) => { if (!controller.signal.aborted) setState({ data, error: '', busy: false, key }); })
      .catch(() => { if (!controller.signal.aborted) setState({ data: null, error: 'Schedules could not be loaded. Please retry.', busy: false, key }); });
    return () => controller.abort();
  }, [key, attempt]);
  return { ...(state.key === key ? state : { data: null, error: '', busy: !!path }), retry: () => setAttempt(n => n + 1) };
}
export const scheduleTime = value => new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
