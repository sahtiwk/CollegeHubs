import React, { useEffect, useRef, useState } from 'react';
import { useMotionPreference } from '../../hooks/useMotionPreference';
const loadEngine = () => import('./shaderEngine');
export default function ShaderBackdrop({ enabled = false, load = loadEngine }) {
  const host = useRef(null), { motionAllowed } = useMotionPreference();
  const [status, setStatus] = useState('static');
  useEffect(() => {
    if (!enabled || !motionAllowed) { setStatus('static'); return; }
    let disposed = false, failed = false, instance, device, canvas, starting = false, visible = false, timeout;
    const stop = () => { clearTimeout(timeout); instance?.destroy(); instance = null; device?.destroy(); device = null; canvas?.remove(); };
    const fallback = () => { if (disposed) return; failed = true; stop(); setStatus('fallback'); };
    const sync = async () => {
      const active = visible && document.visibilityState === 'visible';
      if (!active) { instance?.pause(); return; }
      if (instance) { instance.resume(); return; }
      if (disposed || failed || starting) return;
      starting = true;
      timeout = setTimeout(fallback, 15000);
      try {
        if (!navigator.gpu || navigator.connection?.saveData) { fallback(); return; }
        const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'low-power' });
        if (disposed || failed) return;
        if (!adapter) { fallback(); return; }
        const acquired = await adapter.requestDevice({ requiredFeatures: [...adapter.features] });
        if (disposed || failed) { acquired.destroy(); return; }
        device = acquired;
        device.lost.then(() => { if (!disposed && device === acquired) fallback(); });
        const engine = await load();
        if (disposed || failed) return;
        canvas = document.createElement('canvas'); canvas.width = 480; canvas.height = 280;
        canvas.style.width = '480px'; canvas.style.height = '280px';
        host.current.append(canvas);
        const mounted = await engine.mountShader(canvas, { adapter, device }, fallback);
        if (disposed || failed) { mounted.destroy(); return; }
        instance = mounted;
        clearTimeout(timeout);
        if (instance.getFailureReason()) { fallback(); return; }
        setStatus('enhanced');
        if (!visible || document.visibilityState !== 'visible') instance.pause();
      } catch { fallback(); }
      finally { starting = false; }
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; void sync(); });
    observer.observe(host.current); document.addEventListener('visibilitychange', sync);
    return () => { disposed = true; observer.disconnect(); document.removeEventListener('visibilitychange', sync); stop(); };
  }, [enabled, motionAllowed, load]);
  return <div ref={host} className="shader-backdrop" aria-hidden="true" data-effect={status} />;
}
