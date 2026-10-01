import React, { useEffect, useState } from 'react';
import api from '../api';
import { NavLink } from 'react-router-dom';
const modules = [{ module: 'arcade', label: 'Arcade' }, { module: 'interview', label: 'Interview' }, { module: 'learn', label: 'Learn' }];
export default function ModuleNavigation({ onNavigate = () => {} }) {
  const [enabled, setEnabled] = useState([]);
  useEffect(() => {
    let active = true;
    api.get('/auth/modules').then(({ data }) => {
      if (active) setEnabled(data.items.filter(item => item.enabled).map(item => item.module));
    }).catch(() => { if (active) setEnabled([]); });
    return () => { active = false; };
  }, []);
  return <nav className="module-navigation" aria-label="Learning modules">
    <p className="eyebrow">Explore</p>
    {modules.map(item => enabled.includes(item.module) ?
      <NavLink key={item.module} to={'/' + item.module} onClick={onNavigate}>{item.label}<span aria-hidden="true">&#8599;</span></NavLink> :
      <span className="module-unavailable" key={item.module}>{item.label}<small>Unavailable</small></span>)}
  </nav>;
}
