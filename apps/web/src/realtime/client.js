import { io } from 'socket.io-client';
import { getAccessToken, renewSession } from '../api';
export function createChannelSocket() {
  const origin = import.meta.env.VITE_CORE_SOCKET_ORIGIN || (import.meta.env.DEV ? 'http://localhost:5000' : '');
  if (!origin) return null;
  const parsed = new URL(origin);
  if (parsed.origin !== origin || !['https:', ...(import.meta.env.DEV ? ['http:'] : [])].includes(parsed.protocol)) throw new Error('Invalid Core socket origin');
  const socket = io(origin + '/core', { autoConnect: false, auth: done => done({ token: getAccessToken() }), reconnectionDelayMax: 5000, timeout: 10000 });
  let last = getAccessToken(), disposed = false;
  const check = () => {
    const next = getAccessToken();
    if (next === last || disposed) return;
    last = next; socket.disconnect(); if (next) socket.connect();
  };
  const recover = () => { if (!disposed) void renewSession().then(check).catch(() => {}); };
  socket.on('disconnect', reason => { if (reason === 'io server disconnect') recover(); });
  window.addEventListener('core-session', check);
  window.addEventListener('focus', recover);
  socket.dispose = () => {
    disposed = true; window.removeEventListener('core-session', check); window.removeEventListener('focus', recover);
    socket.removeAllListeners(); socket.disconnect();
  };
  return socket;
}
