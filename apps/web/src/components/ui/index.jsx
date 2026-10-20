import React, { forwardRef, useId } from 'react';
export { default as Dialog } from '../Dialog';
export const Button = forwardRef(function Button({ variant = 'primary', busy = false, disabled, children, className = '', type = 'button', ...props }, ref) {
  return <button {...props} ref={ref} type={type} className={`ui-button ui-button--${variant} ${className}`}
    disabled={disabled || busy} aria-busy={busy || undefined}>{children}</button>;
});
export function Card({ as: Element = 'section', children, className = '', ...props }) {
  return <Element {...props} className={`ui-card ${className}`}>{children}</Element>;
}
export function Status({ tone = 'info', children, live = false }) {
  return <div className={`ui-status ui-status--${tone}`} role={live ? 'status' : undefined}>{children}</div>;
}
export function Field({ label, hint, error, id, ...props }) {
  const generated = useId(), inputId = id || generated;
  return <div className="ui-field"><label htmlFor={inputId}>{label}</label>
    <input {...props} id={inputId} aria-invalid={Boolean(error)} aria-describedby={error || hint ? `${inputId}-help` : undefined} />
    {(error || hint) && <p id={`${inputId}-help`} className={error ? 'error' : 'muted'}>{error || hint}</p>}
  </div>;
}
export function EmptyState({ title, children, action }) {
  return <section className="ui-empty"><h3>{title}</h3><p>{children}</p>{action}</section>;
}
