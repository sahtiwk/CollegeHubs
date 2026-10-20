import React from 'react';
export const auraLabels = { 'study.completed': 'Study completion', 'answer.accepted': 'Accepted answer', 'code.shared': 'Code shared', 'resource.shared': 'Resource shared', 'arcade.daily_completed': 'Daily Arcade challenge', 'arcade.game_completed': 'Arcade game completed', 'learn.quiz_completed': 'Learn quiz completed', 'learn.node_mastered': 'Learn node mastered', 'interview.completed': 'Interview completed', 'interview.session_completed': 'Interview completed' };
export default function AuraTicker({ receipts = [], title = 'Recent activity' }) {
  return <div><h3>{title}</h3>{receipts.length ? <ul className="aura-receipts">{receipts.map(row => <li key={row.eventId}>
    <div>{auraLabels[row.type] || row.type}<small className="muted">{row.dayKey} · {row.reason.replaceAll('_', ' ')}</small></div>
    <strong>+{row.awardedAura}</strong>
  </li>)}</ul> : <p className="muted">No scored contributions yet. Your first eligible contribution will appear here.</p>}</div>;
}
