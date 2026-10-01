import { io } from 'socket.io-client';

export function createChannelSocket() {
  const origin = import.meta.env.VITE_CORE_SOCKET_ORIGIN || (import.meta.env.DEV ? 'http://localhost:5000' : '');
  if (!origin) return null; // REST history remains usable when realtime is not configured.
  const parsed = new URL(origin);
  if (parsed.origin !== origin || !['https:', ...(import.meta.env.DEV ? ['http:'] : [])].includes(parsed.protocol)) throw new Error('Invalid Core socket origin');
  const token = localStorage.getItem('socialstream_token');
  const socket = io(origin + '/core', { autoConnect: false, auth: { token }, reconnectionDelayMax: 5000, timeout: 10000 });
  const check = () => { if (localStorage.getItem('socialstream_token') !== token) socket.disconnect(); };
  window.addEventListener('core-session', check);
  window.addEventListener('storage', check);
  socket.dispose = () => {
    window.removeEventListener('core-session', check); window.removeEventListener('storage', check);
    socket.removeAllListeners(); socket.disconnect();
  };
  return socket;
}
