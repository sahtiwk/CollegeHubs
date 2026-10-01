import React, { useEffect, useRef } from 'react';
export default function Dialog({ open, onClose, title, children, drawer = false, returnFocus }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const previous = returnFocus?.current || document.activeElement;
    const dialog = ref.current;
    dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, [open]);
  return <dialog ref={ref} className={drawer ? 'drawer' : 'dialog'} aria-label={title}
    onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const controls = [...ref.current.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), [tabindex="0"]')].filter(element => element.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === ref.current) {
      const rect = ref.current.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    } }}>
    <div className="dialog-heading"><h2>{title}</h2><button type="button" onClick={onClose} aria-label="Close dialog">Close</button></div>
    {open && children}
  </dialog>;
}
