import React, { useRef, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useHubTheme } from '../theme/HubThemeProvider';
import Sidebar from './Sidebar';
import Dialog from './Dialog';
import EditProfileModal from './EditProfileModal';
export default function HubShell() {
  const { hub, error, retry } = useHubTheme();
  const [drawer, setDrawer] = useState(false);
  const [editing, setEditing] = useState(false);
  const menuButton = useRef(null);
  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="topbar">
      <Link className="wordmark" to="/">CollegeHubs<span className="brand-dot" aria-hidden="true">.</span></Link>
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
