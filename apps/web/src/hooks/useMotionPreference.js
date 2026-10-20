import { useEffect, useState } from 'react';
const KEY = 'collegehubs-motion';
export function useMotionPreference() {
  const [reduced, setReduced] = useState(() => typeof matchMedia !== 'function' || matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [off, setOff] = useState(() => { try { return localStorage.getItem(KEY) === 'off'; } catch { return false; } });
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    const stored = event => { if (event.type === 'motion-preference') setOff(event.detail); else try { setOff(localStorage.getItem(KEY) === 'off'); } catch {} };
    media.addEventListener('change', update); window.addEventListener('storage', stored); window.addEventListener('motion-preference', stored);
    return () => { media.removeEventListener('change', update); window.removeEventListener('storage', stored); window.removeEventListener('motion-preference', stored); };
  }, []);
  useEffect(() => { document.documentElement.dataset.motion = reduced || off ? 'off' : 'on'; }, [reduced, off]);
  return { motionAllowed: !reduced && !off, reduced, off, setMotionOff(value) {
    setOff(value); try { localStorage.setItem(KEY, value ? 'off' : 'on'); } catch {}
    window.dispatchEvent(new CustomEvent('motion-preference', { detail: value }));
  } };
}
