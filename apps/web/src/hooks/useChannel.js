import { useEffect, useRef, useState } from 'react';
import api from '../api';
import { createChannelSocket } from '../realtime/client';
import { mergeHistory } from '../realtime/history';

export function useChannel(channelId, hubId) {
  const [state, setState] = useState({ items: [], title: '', loading: true, error: '', live: false, revision: 0 });
  const control = useRef(null);
  useEffect(() => {
    let dead = false, running = false, again = false, cursor = null, rows = [], socket;
    const abort = new AbortController();
    setState({ items: [], title: '', loading: true, error: '', live: false, revision: 0 });
    const path = '/channels/' + channelId + '/messages';
    const update = patch => { if (!dead) setState(old => ({ ...old, ...patch })); };
    async function sync() {
      if (dead) return;
      if (running) { again = true; return; }
      running = true;
      try {
        do {
          again = false;
          const { data } = await api.get(path, { params: cursor === null ? {} : { afterSeq: cursor }, signal: abort.signal });
          if (dead) return;
          const initial = cursor === null;
          const merged = mergeHistory(rows, data, hubId, channelId, cursor);
          rows = merged.items; cursor = merged.cursor;
          update({ items: rows, title: data.title, loading: false, error: '' });
          // Initial history is the latest 50; subsequent pages catch up forwards.
          if (!initial && data.hasMore) again = true;
        } while (again && !dead);
        // Acceptance changes an existing question, not its creation sequence.
        // Refresh the visible tail to recover a lost update notification too.
        const { data: tail } = await api.get(path, { signal: abort.signal });
        if (!dead) {
          rows = mergeHistory(rows, tail, hubId, channelId, null).items;
          setState(old => ({ ...old, items: rows, revision: old.revision + 1 }));
        }
      } catch (error) { update({ loading: false, error: error.response?.data?.error?.message || 'History unavailable. Your draft is unchanged; retry when connected.' }); }
      finally { running = false; }
    }
    function recover() { if (document.visibilityState === 'visible') void sync(); }
    try {
      socket = createChannelSocket();
      socket?.on('connect', () => {
        update({ live: true });
        socket.timeout(10000).emit('channel:join', { channelId }, (error, result) => {
          if (dead) return;
          if (error || result?.error) update({ live: false });
          void sync();
        });
      });
      socket?.on('message:created', row => { if (row.hubId === hubId && row.channelId === channelId) void sync(); });
      socket?.on('message:updated', row => { if (row.hubId === hubId && row.channelId === channelId) void sync(); });
      socket?.on('disconnect', () => update({ live: false }));
      socket?.on('connect_error', () => update({ live: false }));
      socket?.connect();
    } catch { update({ live: false }); }
    control.current = {
      sync,
      async send(body) {
        if (dead) throw new Error('Channel changed');
        // HTTP is also available during socket outages; retries are always explicit.
        const { data } = await api.post(path, body, { signal: abort.signal });
        if (dead) throw new Error('Channel changed');
        void sync(); return data;
      },
    };
    void sync();
    // Repairs a lost final broadcast even when no later message exposes the gap.
    const timer = setInterval(recover, 15000);
    window.addEventListener('focus', recover); document.addEventListener('visibilitychange', recover);
    return () => { dead = true; abort.abort(); clearInterval(timer); socket?.dispose(); window.removeEventListener('focus', recover); document.removeEventListener('visibilitychange', recover); control.current = null; };
  }, [channelId, hubId]);
  return { ...state, retry: () => control.current?.sync(), send: body => control.current?.send(body) ?? Promise.reject(new Error('Channel unavailable')) };
}
