import React, { useEffect, useState } from 'react';
import api from '../api';
const modules = [{ module: 'arcade', label: 'Arcade' }, { module: 'interview', label: 'Interview' }, { module: 'learn', label: 'Learn' }];
export default function ModuleNavigation() {
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
      <a key={item.module} href={'/' + item.module + '/auth/start'}>{item.label}<span aria-hidden="true">&#8599;</span></a> :
      <span className="module-unavailable" key={item.module}>{item.label}<small>Unavailable</small></span>)}
  </nav>;
}
