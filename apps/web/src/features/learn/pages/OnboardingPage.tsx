// Retains MargaAI's path choice → self-rating → initialization flow; no DAG generation.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLearnLoad, useLearnAction, LoadState } from '../Learn';
export const RatingOptions = () => <><option value="new">I’m new to this</option><option value="some">I’ve tried a little</option><option value="comfortable">I’m comfortable with the basics</option><option value="advanced">I use this regularly</option></>;
export default function OnboardingPage() {
  const paths = useLearnLoad('/dashboard/domains'), profile = useLearnLoad('/profile/preferences'), action = useLearnAction(), navigate = useNavigate();
  const [domain, setDomain] = useState('dsa'), [rating, setRating] = useState('new'), [goal, setGoal] = useState(''), [minutes, setMinutes] = useState(20);
  useEffect(() => { if (profile.data) { setGoal(profile.data.goal); setMinutes(profile.data.dailyMinutes); } }, [profile.data]);
  useEffect(() => { if (paths.data) setRating(paths.data.domains.find((p: any) => p.domain === domain)?.selfRating || 'new'); }, [paths.data, domain]);
  return <><header className="learn-heading"><p className="eyebrow">Learn / find your starting point</p><h1>Choose a direction.</h1><p>A small, steady start. Tell us what you want to learn and make room for it in your day.</p></header>
    {!paths.data || !profile.data ? <LoadState load={!paths.data ? paths : profile} /> : <form className="panel stack learn-form" onSubmit={e => { e.preventDefault(); action.run(async call => { await call('/onboarding', 'POST', { domain, selfRating: rating, goal, dailyMinutes: minutes }); navigate('/learn'); }); }}>
      <fieldset disabled={action.busy}><legend>1. Choose your path</legend><div className="learn-path-options">{paths.data.domains.map((p: any) => <label key={p.domain} className={'learn-path-option' + (domain === p.domain ? ' selected' : '')}><input type="radio" name="domain" value={p.domain} checked={domain === p.domain} onChange={() => { setDomain(p.domain); setRating(p.selfRating); }} /><span><strong>{p.label}</strong><span>{p.description}</span><small>{p.enrolled ? 'Already enrolled · keep your saved path' : '2 connected topics · curated reading'}</small></span></label>)}</div></fieldset>
      <fieldset disabled={action.busy}><legend>2. Set your starting point</legend><label>How familiar are you with this path?<select value={rating} onChange={e => setRating(e.target.value)}><RatingOptions /></select></label><p className="muted">This is a self-rating. It does not unlock topics or count as an assessment.</p>
      <label>Your learning goal <span className="muted">(optional)</span><input maxLength={240} value={goal} onChange={e => setGoal(e.target.value)} placeholder="Build a small project, or strengthen my fundamentals" /></label><label>Daily reading time<select value={minutes} onChange={e => setMinutes(Number(e.target.value))}>{[10,20,30,45,60].map(n => <option key={n} value={n}>{n} minutes</option>)}</select></label></fieldset>
      {action.error && <p role="alert">{action.error}</p>}<button className="primary" disabled={action.busy}>{action.busy ? 'Saving your path…' : 'Save & open my learning'}</button><p className="muted">Starting readings are available now. Quizzes, test-out and assessed progress are coming later.</p>
    </form>}
  </>;
}
