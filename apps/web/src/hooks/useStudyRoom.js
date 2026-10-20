import { useEffect, useRef, useState } from 'react';
import api from '../api';
import { createChannelSocket } from '../realtime/client';
import { clockSample, validateSnapshot } from '../realtime/study';
export function useStudyRoom(roomId, hubId) {
  const [state, setState] = useState({ data: null, clock: null, loading: true, error: '', live: false, refreshId: 0 });
  const control = useRef(null);
  useEffect(() => {
    let dead = false, pending = null, socket;
    const abort = new AbortController(), path = '/study-rooms/' + roomId;
    const update = patch => { if (!dead) setState(old => ({ ...old, ...patch })); };
    setState({ data: null, clock: null, loading: true, error: '', live: false, refreshId: 0 });
    function apply(data, sent, received) {
      validateSnapshot(data, roomId, hubId);
      if (dead) return;
      setState(old => {
        if (old.data && (data.room.version < old.data.room.version || data.ownSolution.revision < old.data.ownSolution.revision || (old.data.ownSolution.submittedAt && !data.ownSolution.submittedAt))) return old;
        return { ...old, data, clock: clockSample(data.serverNow, sent, received), error: '', loading: false, refreshId: old.refreshId + 1 };
      });
    }
    async function sync() {
      if (dead) return;
      if (pending) return pending;
      pending = (async () => {
        const sent = performance.now();
        try { const { data } = await api.get(path, { signal: abort.signal }); apply(data, sent, performance.now()); return data; }
        catch (error) { update({ loading: false, error: error.response?.data?.error?.message || 'Room sync unavailable. Unsaved text stays in this tab.' }); }
        finally { pending = null; }
      })();
      return pending;
    }
    control.current = { sync, async action(action, body) {
      const sent = performance.now();
      const { data } = await api.post(path + '/' + action, body, { signal: abort.signal });
      if (dead) throw new Error('Room changed');
      apply(data, sent, performance.now()); return data;
    } };
    const recover = () => { if (document.visibilityState === 'visible') void sync(); };
    try {
      socket = createChannelSocket();
      socket?.on('connect', () => {
        socket.timeout(10000).emit('study:sync', { roomId }, (error, result) => { if (dead) return; update({ live: !error && !result?.error }); void sync(); });
      });
      for (const event of ['study:state', 'study:closed']) socket?.on(event, data => { if (data?.room?._id === roomId && data.room.hubId === hubId) void sync(); });
      socket?.on('disconnect', () => update({ live: false })); socket?.on('connect_error', () => update({ live: false })); socket?.connect();
    } catch { update({ live: false }); }
    void sync();
    const timer = setInterval(recover, 5000);
    window.addEventListener('core-session', recover); window.addEventListener('focus', recover); document.addEventListener('visibilitychange', recover);
    return () => { dead = true; abort.abort(); socket?.dispose(); clearInterval(timer); window.removeEventListener('core-session', recover); window.removeEventListener('focus', recover); document.removeEventListener('visibilitychange', recover); control.current = null; };
  }, [roomId, hubId]);
  return { ...state, sync: () => control.current?.sync(), action: (name, body) => control.current?.action(name, body) ?? Promise.reject(new Error('Room unavailable')) };
}
