import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Card, Dialog, EmptyState, Field, Status } from '../components/ui';
import ShaderBackdrop from '../components/visual/ShaderBackdrop';
import { useMotionPreference } from '../hooks/useMotionPreference';
import { defaultTokens, themeStyle } from '../utils/collegeThemes';
import '../index.css';
import './designLab.css';

const journeys = {
  Learn: { label: 'PICK UP WHERE YOU LEFT OFF', title: 'Big ideas. Small steps.', subject: 'Data structures', task: 'Make sense of binary trees', detail: 'A visual reading, a short exercise, and one concept that clicks.', action: 'Preview the lesson', tag: '12 min · Reading + practice', steps: ['Understand the structure', 'Walk through an example', 'Try it yourself'] },
  Study: { label: 'MAKE ROOM FOR FOCUS', title: 'Better, together.', subject: 'Study rooms', task: 'One problem. A few perspectives.', detail: 'Set aside a little time, work independently, then compare approaches.', action: 'Preview a session', tag: '25 min · Focus session', steps: ['Choose a shared problem', 'Find your own approach', 'Compare and reflect'] },
  Practice: { label: 'GET A LITTLE MORE READY', title: 'Find your own rhythm.', subject: 'Interview practice', task: 'Turn your thinking into words', detail: 'Work through a prompt, explain your approach, and reflect on your answer.', action: 'Preview a prompt', tag: '8 min · Guided practice', steps: ['Read the prompt', 'Explain your reasoning', 'Review your response'] },
};
function DesignLab() {
  const [theme, setTheme] = useState('cvr'), [open, setOpen] = useState(false), [effect, setEffect] = useState(false);
  const [journey, setJourney] = useState('Learn'), [expanded, setExpanded] = useState(false);
  const trigger = useRef(null), motion = useMotionPreference(), sample = journeys[journey];
  const fixtures = { cvr: defaultTokens, sky: { ...defaultTokens, background: '#DFF7FF', surface: '#DFF7FF', secondary: '#F4ECD6' }, bright: { ...defaultTokens, accent: '#FFFFFF' } };
  return <div className="app-theme design-lab" style={themeStyle(fixtures[theme])}>
    <a href="#lab-content" className="skip-link">Skip to content</a>
    <header className="lab-topbar"><a className="wordmark" href="#lab-content"><span className="lab-brand-icon" aria-hidden="true">✳</span> CollegeHubs<span className="brand-dot" aria-hidden="true">.</span></a><nav aria-label="Catalogue sections"><a href="#workspace">The workspace</a><a href="#catalogue">The details</a></nav><span className="hub-badge">{theme === 'sky' ? 'Sky · fixture' : theme === 'bright' ? 'Bright · fixture' : 'CVR · fixture'}</span></header>
    <main id="lab-content" tabIndex={-1}>
      <section className="lab-hero">
        <div className="lab-hero-copy"><p className="eyebrow"><span className="lab-live-dot" /> A place for your next chapter</p><h1>Your campus.<br />Your next<br /><em>breakthrough.</em></h1><p>Find your people. Follow your curiosity.<br />Make something of the time between classes.</p><div className="lab-actions"><Button onClick={() => document.getElementById('workspace').scrollIntoView()}>Find your starting point <span aria-hidden="true">↗</span></Button><a href="#catalogue">A closer look <span aria-hidden="true">↓</span></a></div><div className="lab-hero-foot"><span>BUILT AROUND YOU</span><span>Learn / Study / Practice</span></div></div>
        <div className="lab-poster hero-surface">
          <ShaderBackdrop enabled={effect} />
          <div className="poster-grid" aria-hidden="true" />
          <div className="poster-caption"><span>THE CAMPUS COLLECTIVE</span><span>VOL. 01 / SAMPLE</span></div>
          <svg className="poster-orbit" viewBox="0 0 480 480" fill="none" aria-hidden="true"><circle cx="240" cy="240" r="200"/><ellipse cx="240" cy="240" rx="115" ry="200" transform="rotate(35 240 240)"/><ellipse cx="240" cy="240" rx="115" ry="200" transform="rotate(-35 240 240)"/><path d="M40 240h400M240 40v400"/></svg>
          <div className="poster-note"><span className="eyebrow">Note to self / 001</span><p>You don’t have to<br />figure it all out<br /><em>on your own.</em></p><span className="note-rule" /><span className="note-signature">See you at the Hub. ↗</span></div>
          <svg className="poster-flower" viewBox="0 0 120 120" aria-hidden="true"><g fill="currentColor">{Array.from({length:8},(_,i)=><ellipse key={i} cx="60" cy="30" rx="15" ry="29" transform={`rotate(${i*45} 60 60)`}/>)}</g><circle cx="60" cy="60" r="15" fill="#20241E"/></svg>
          <div className="poster-ticket"><span className="ticket-icon" aria-hidden="true">↗</span><div><span className="eyebrow">Less scrolling. More doing.</span><strong>Your next idea lives here.</strong></div></div>
          <span className="poster-bottom">A LITTLE CURIOSITY GOES A LONG WAY.</span>
        </div>
      </section>
      <div className="lab-strip"><span>ONE CAMPUS. MANY WAYS FORWARD.</span><span>Find your people <i>✳</i> Build your skills <i>✳</i> Make your mark</span><span>01 — 03</span></div>
      <section className="lab-workspace" id="workspace" aria-labelledby="workspace-heading">
        <div className="lab-section-heading"><div><p className="eyebrow">01 / YOUR SPACE TO GROW</p><h2 id="workspace-heading">Come curious.<br /><em>Leave with something.</em></h2></div><p>Start with one small thing.<br />The rest has a way of following.</p></div>
        <div className="workspace-preview"><aside><span className="eyebrow">A DAY AT THE HUB</span><div className="journey-tabs" role="tablist" aria-label="Sample journeys">{Object.keys(journeys).map((name,i)=><button key={name} role="tab" id={`tab-${name}`} aria-controls="journey-panel" aria-selected={journey===name} tabIndex={journey===name?0:-1} onKeyDown={e=>{if(['ArrowDown','ArrowUp','ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();const names=Object.keys(journeys), next=e.key==='Home'?0:e.key==='End'?2:(i+(['ArrowDown','ArrowRight'].includes(e.key)?1:2))%3;setJourney(names[next]);setExpanded(false);document.getElementById(`tab-${names[next]}`).focus();}}} onClick={()=>{setJourney(name);setExpanded(false);}}><span>0{i+1}</span>{name}<span aria-hidden="true">↗</span></button>)}</div><p className="sample-disclaimer">An interactive sample.<br />Your real workspace comes later.</p></aside><div className="journey-content" id="journey-panel" role="tabpanel" aria-labelledby={`tab-${journey}`} tabIndex={0}><div className="journey-kicker"><span className="eyebrow">{sample.label}</span><span className="sample-label">SAMPLE WORKSPACE</span></div><h3>{sample.title}</h3><div className="lesson-card"><div className="lesson-symbol" aria-hidden="true">{journey==='Learn'?'↳':journey==='Study'?'◎':'✳'}</div><div><span className="eyebrow">{sample.subject}</span><h4>{sample.task}</h4><p>{sample.detail}</p><span className="lesson-meta">{sample.tag}</span></div><Button variant="secondary" aria-expanded={expanded} aria-controls="sample-steps" onClick={()=>setExpanded(!expanded)}>{expanded?'Close preview':sample.action}<span aria-hidden="true"> ↗</span></Button></div>{expanded&&<ol id="sample-steps" className="sample-steps">{sample.steps.map(step=><li key={step}>{step}</li>)}</ol>}<div className="workspace-caption"><span>Progress starts with showing up.</span><span aria-hidden="true">↗</span></div></div></div>
      </section>
      <section className="lab-intro lab-section-heading" id="catalogue"><div><p className="eyebrow">02 / THE SMALL THINGS MATTER</p><h2>Thoughtful by design.</h2></div><p>Clear choices. Room to breathe.<br />A little personality in the details.</p></section>
      <div className="lab-grid">
        <Card><p className="eyebrow">01 / Actions & fields</p><h2>A little clarity goes a long way.</h2><Field label="Study goal" placeholder="What would you like to learn?" hint="Keep it small enough to start today." /><Field label="College email" defaultValue="student@example" error="Use your complete college email address." /><div className="lab-actions"><Button ref={trigger} onClick={() => setOpen(true)}>Open navigation</Button><Button variant="secondary" onClick={()=>document.getElementById('workspace').scrollIntoView()}>Explore sample</Button><Button disabled>Unavailable</Button><Button busy>Saving…</Button></div></Card>
        <Card><p className="eyebrow">02 / Honest feedback</p><h2>You’ll always know where you stand.</h2><Status tone="success">Saved — your latest revision is safe.</Status><Status tone="warning">Reward pending — your result is saved.</Status><Status tone="error">Couldn’t connect. Keep your draft and retry.</Status><Status>Practice feedback is a learning aid.</Status></Card>
        <Card><p className="eyebrow">03 / Make yourself comfortable</p><h2>Your space. Your pace.</h2><label htmlFor="fixture">College identity</label><select id="fixture" value={theme} onChange={e => setTheme(e.target.value)}><option value="cvr">CVR palette fixture</option><option value="sky">Sky palette fixture</option><option value="bright">Bright accent stress case</option></select><label className="lab-checkbox"><input type="checkbox" checked={motion.off} onChange={e => motion.setMotionOff(e.target.checked)} /> Turn decorative motion off</label><label className="lab-checkbox"><input type="checkbox" checked={effect} onChange={e => setEffect(e.target.checked)} /> Try the optional shader</label><p className="muted">Static is the default. System reduced-motion always takes priority.</p></Card>
        <EmptyState title="A fresh page. All yours." action={<Button variant="secondary" onClick={() => document.getElementById('fixture').focus()}>Make yourself at home ↗</Button>}>Every good thing starts somewhere. Choose a goal, find a room, or simply follow your curiosity.</EmptyState>
      </div>
      <footer className="lab-footer"><a className="wordmark" href="#lab-content">CollegeHubs<span className="brand-dot" aria-hidden="true">.</span></a><span>A little structure. A lot of possibility.</span><span>DESIGN STUDY / 02</span></footer>
    </main>
    <Dialog open={open} onClose={() => setOpen(false)} title="Workspace navigation" returnFocus={trigger} drawer>
      <nav aria-label="Preview navigation" className="lab-nav">{['Home','Channels','Study','Learn','Interview','Arcade','Calendar'].map(name => <a key={name} href="#catalogue" onClick={() => setOpen(false)}>{name}</a>)}</nav>
      <label htmlFor="navigation-mode">View</label><select id="navigation-mode"><option>Workspace</option><option>Progress</option></select>
    </Dialog>
  </div>;
}
createRoot(document.getElementById('root')).render(<React.StrictMode><DesignLab /></React.StrictMode>);
