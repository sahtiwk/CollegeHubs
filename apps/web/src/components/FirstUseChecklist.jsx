import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { continuation } from './moduleContinuation';

const goals = { learn: ['Learn a topic', '/learn'], arcade: ['Practice a short game', '/arcade'], interview: ['Prepare for an interview', '/interview'] };
function read(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '{}');
    return { dismissed: value.dismissed === true, goal: Object.hasOwn(goals, value.goal) ? value.goal : '' };
  } catch { return { dismissed: false, goal: '' }; }
}
export default function FirstUseChecklist({ scope, user, modules, busy, onProfile }) {
  const key = 'collegehubs:first-steps:v1:' + scope;
  const [preference, setPreference] = useState(() => read(key));
  function save(change) {
    const next = { ...preference, ...change };
    setPreference(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* Remains usable without storage. */ }
  }
  if (preference.dismissed) return <button type="button" className="quiet" onClick={() => save({ dismissed: false })}>Show first steps</button>;
  const current = name => !busy && modules?.[name]?.status === 'ok';
  const saved = Object.keys(goals).map(name => continuation(name, modules?.[name])).find(Boolean);
  const items = [
    { label: 'Save your profile', done: !!user.onboardingComplete, known: true, action: <button type="button" onClick={onProfile}>Open profile</button> },
    { label: 'Choose a learning path', done: modules?.learn?.enrollments > 0, known: current('learn'), action: <Link to="/learn/onboarding">Choose a path</Link> },
    { label: 'Finish one practice activity', done: (modules?.learn?.completedQuizzes || 0) + (modules?.arcade?.completedGames || 0) + (modules?.interview?.completedInterviews || 0) > 0,
      known: ['learn','arcade','interview'].every(current), action: <Link to={saved?.to || '/learn'}>{saved ? 'Continue saved practice' : 'Explore practice'}</Link> },
  ];
  return <section className="first-steps stack" aria-label="Your first steps">
    <div className="section-heading"><h3>A start that suits you.</h3><button type="button" className="quiet" onClick={() => save({ dismissed: true })}>Hide first steps</button></div>
    <p>These optional steps reflect saved work. Opening a page adds no progress or Aura. You can stop whenever you like.</p>
    <ul>{items.map(item => <li key={item.label}><div><strong>{item.label}</strong><span className="muted">{!item.known ? 'Progress not confirmed yet' : item.done ? 'Saved completion' : 'Whenever you’re ready'}</span></div>{item.action}</li>)}</ul>
    <label htmlFor="first-steps-goal">What would be useful next? <span className="muted">(optional)</span></label>
    <select id="first-steps-goal" value={preference.goal} onChange={event => save({ goal: event.target.value })}>
      <option value="">No goal for now</option>{Object.entries(goals).map(([id, [label]]) => <option key={id} value={id}>{label}</option>)}
    </select>
    {preference.goal && <Link to={goals[preference.goal][1]}>Open my chosen activity →</Link>}
    <small className="muted">Your choice and dismissal are saved only in this browser for this account and college.</small>
  </section>;
}
