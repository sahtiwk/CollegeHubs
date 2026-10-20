import React, { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useHubTheme } from '../theme/HubThemeProvider';
import Sidebar from './Sidebar';
import Dialog from './Dialog';
import '../styles/workspace-editorial.css';
import EditProfileModal from './EditProfileModal';
export default function HubShell() {
  const { hub, error, retry } = useHubTheme();
  const [drawer, setDrawer] = useState(false);
  const [editing, setEditing] = useState(false);
  const menuButton = useRef(null);
  // Local acceptance marker proves feature navigation preserves this shell instance.
  const [shellInstance] = useState(() => import.meta.env.DEV ? crypto.randomUUID() : undefined);
  const { pathname, hash } = useLocation();
  useEffect(() => {
    document.getElementById('main-content')?.focus({ preventScroll: true });
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);
  useEffect(() => {
    if (!hash) return;
    let frame, attempts = 0;
    const reveal = () => { const target = document.getElementById(hash.slice(1)); if (target) { target.scrollIntoView(); target.setAttribute('tabindex','-1'); target.focus({preventScroll:true}); } else if (attempts++ < 60) frame = requestAnimationFrame(reveal); };
    reveal(); return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);
  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="topbar" data-shell-instance={shellInstance}>
      <Link className="wordmark" to="/dashboard">CollegeHubs<span className="brand-dot" aria-hidden="true">.</span></Link>
      <span className="hub-name">{hub?.logoUrl && <img className="hub-logo" src={hub.logoUrl} alt="" referrerPolicy="no-referrer" />}{hub?.name || 'Your college Hub'}</span>
      <button ref={menuButton} className="menu-toggle" aria-expanded={drawer} onClick={() => setDrawer(true)}>Menu</button>
    </header>
    {error && <div className="notice" role="alert">{error} <button onClick={retry}>Retry branding</button></div>}
    <div className="hub-layout">
      <aside className="desktop-sidebar"><Sidebar onEdit={() => setEditing(true)} /></aside>
      <main id="main-content" tabIndex={-1}><Outlet /></main>
    </div>
    <Dialog open={drawer} onClose={() => setDrawer(false)} title="Your Hub" drawer returnFocus={menuButton}>
      <Sidebar onNavigate={() => setDrawer(false)} onEdit={() => setEditing(true)} />
    </Dialog>
    <EditProfileModal isOpen={editing} onClose={() => setEditing(false)} returnFocus={menuButton.current?.getClientRects().length ? menuButton : undefined} />
  </>;
}
