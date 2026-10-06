import React from 'react';
export const auraLabels = { 'study.completed': 'Study completion', 'answer.accepted': 'Accepted answer', 'code.shared': 'Code shared', 'resource.shared': 'Resource shared', 'arcade.game_completed': 'Arcade game completed' };
export default function AuraTicker({ receipts = [] }) {
  return <div><h3>Recent activity</h3>{receipts.length ? <ul className="aura-receipts">{receipts.map(row => <li key={row.eventId}>
    <div>{auraLabels[row.type] || row.type}<small className="muted">{row.dayKey} · {row.reason.replaceAll('_', ' ')}</small></div>
    <strong>+{row.awardedAura}</strong>
  </li>)}</ul> : <p className="muted">No scored contributions yet. Your first eligible contribution will appear here.</p>}</div>;
}
