import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUpRight, Braces, Code2, Gamepad2, GraduationCap, MessagesSquare, Mic, Terminal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { hasSessionHint } from '../api';
import { useMotionPreference } from '../hooks/useMotionPreference';
import { previews } from '../components/landing/samples';
import SamplePanel from '../components/landing/SamplePanel';
import '../styles/landing.css';
const ShaderBackdrop = lazy(() => import('../components/visual/ShaderBackdrop'));
const source = 'https://github.com/sahtiwk/CollegeHubs';
const intents = [
  ['Channels', 'Ask questions and share code with classmates.', MessagesSquare],
  ['Study', 'Solve a problem, then compare approaches.', Code2],
  ['Learn', 'Work through a technical path at your pace.', GraduationCap],
  ['Interview', 'Rehearse answers and review feedback.', Mic],
  ['Arcade', 'Practice debugging, sorting and more.', Gamepad2],
];
const faq = [
  ['Can I join with any college email?', 'Hub access requires verified ownership of your email and an exact domain listed in the active college registry. If your college is not configured, your account stays in onboarding. A college name or logo here does not imply endorsement.'],
  ['What happens after I sign up?', 'Verify your email, then open your college workspace. Mail delivery and Google sign-in depend on deployment configuration; the sign-in screens show what is available. This preview needs neither an account nor email delivery.'],
  ['Will these previews save anything?', 'No. All five previews use invented examples bundled with this page. Your sample interactions and typed practice response stay in memory and disappear when you leave or switch previews. They do not create progress or rewards.'],
  ['Why might a feature take time to open?', 'The project is designed for free hosting. Services can sleep, and AI features depend on provider availability and quotas. Your workspace shows loading or retry states. This page and its samples remain available without waking those services.'],
  ['Who can see my work?', 'Your real Hub is college-scoped. Study drafts stay private during a session and become available for peer comparison after it closes. Interview practice and resumes belong to your account. Never include sensitive information in shared messages.'],
  ['Is everything shown here available?', 'Channels, Study, Learn, Interview and ten ranked Arcade games have implemented flows. Deployment availability can vary. Badges reflect verified activity. External progress and bonuses depend on provider availability and verified ownership. Interview feedback is practice guidance, not an employment assessment.'],
];
export default function Landing() {
  const { user } = useAuth(), motion = useMotionPreference();
  const [selected, setSelected] = useState(0), [effect, setEffect] = useState(false);
  const tabs = useRef([]), statement = useRef(null), sample = previews[selected], returning = !!user || hasSessionHint();
  const join = route => returning ? route : '/register?returnTo=' + encodeURIComponent(route);
  useEffect(() => {
    const target = statement.current;
    if (!motion.motionAllowed || !target) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) target.dataset.revealed = 'true';
    }, { threshold: .5 });
    observer.observe(target);
    return () => { observer.disconnect(); delete target.dataset.revealed; };
  }, [motion.motionAllowed]);
  function choose(index, focus = false) { setSelected(index); if (focus) tabs.current[index]?.focus(); }
  function explore(name) { const index = previews.findIndex(item => item.name === name); choose(index); document.getElementById('explore').scrollIntoView({ block: 'center' }); tabs.current[index]?.focus({ preventScroll: true }); }
  return <div className="landing">
    <a href="#landing-main" className="skip-link">Skip to content</a>
    <header className="lp-header">
      <Link className="lp-brand" to="/" aria-label="CollegeHubs home"><Braces size={22} aria-hidden="true" /> CollegeHubs</Link>
      <nav aria-label="Public navigation"><a href="#explore">Explore</a><a href="#how-it-works">How it works</a><a href="#open-source">Open source</a></nav>
      <div className="lp-entry"><Link to="/login?returnTo=%2Fdashboard">Sign in</Link><Link className="lp-button lp-button-small btn btn--primary" to={join('/dashboard')}>{returning ? 'Continue' : 'Join your Hub'} <span aria-hidden="true">↗</span></Link></div>
    </header>
    <main id="landing-main" tabIndex={-1}>
      <section className="lp-hero hero" data-enter aria-labelledby="landing-title">
        <div className="lp-hero-copy">
          <h1 id="landing-title">Your college <em>coding workspace.</em></h1>
          <p className="lp-intro">Study with classmates, build technical skills, and practice for interviews in your college’s Hub.</p>
          <div className="lp-hero-actions">
            <Link className="lp-button btn btn--primary" to={join('/dashboard')}>{returning ? 'Continue to your workspace' : 'Join your Hub'} <ArrowUpRight size={17} aria-hidden="true" /></Link>
            <a className="m-link" href="#explore">Explore a preview <ArrowDown size={15} aria-hidden="true" /></a>
          </div>
          <p className="lp-eligibility"><a href="#eligibility">Check college eligibility</a></p>
        </div>
        <div className="lp-stage" data-visual data-enter-media>
          {effect && motion.motionAllowed && <Suspense fallback={null}><ShaderBackdrop enabled /></Suspense>}
          <section className="lp-preview app-frame" id="explore" aria-label="Interactive sample workspace">
            <div className="lp-preview-top"><span><Terminal size={16} aria-hidden="true" /> Workspace preview</span><span className="lp-tag">5 samples</span></div>
          <div className="lp-tabs" role="tablist" aria-label="Workspace previews">{previews.map((item, index) => <button key={item.name} ref={el => { tabs.current[index] = el; }} id={'preview-tab-' + index} role="tab" aria-selected={selected === index} aria-controls="preview-panel" tabIndex={selected === index ? 0 : -1} onClick={() => choose(index)} onKeyDown={event => { if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return; event.preventDefault(); choose(event.key === 'Home' ? 0 : event.key === 'End' ? previews.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : previews.length - 1)) % previews.length, true); }}>{item.name}</button>)}</div>
          <div className="lp-panel" id="preview-panel" role="tabpanel" aria-labelledby={'preview-tab-' + selected} tabIndex={0}><SamplePanel key={sample.name} name={sample.name} /></div>
            <div className="lp-preview-bottom"><Link className="m-link" to={join(sample.route)}>{sample.action} <ArrowUpRight size={15} aria-hidden="true" /></Link><span>Sample activity stays in this page.</span></div>
          </section>
        </div>
      </section>
      <section className="lp-section lp-toolkit" aria-labelledby="intent-title">
        <div className="lp-section-heading"><h2 id="intent-title">Tools for your college Hub</h2><p>Pick a tool to try it in the workspace preview.</p></div>
        <div className="lp-intentions">{intents.map(([tab, detail, Icon]) =>
          <button className="lp-tool btn" key={tab} onClick={() => explore(tab)}>
            <Icon className="lp-tool-icon" size={25} aria-hidden="true" />
            <h3>{tab}</h3><p>{detail}</p><ArrowUpRight className="lp-tool-arrow" size={16} aria-hidden="true" />
          </button>
        )}</div>
      </section>
      <section className="lp-section lp-how" id="how-it-works" aria-labelledby="how-title">
        <h2 id="how-title">From college email to workspace</h2>
        <ol className="lp-steps">
          <li><h3>Verify your email</h3><p>Use an email address from a supported college to join its Hub.</p></li>
          <li><h3>Open a subject channel</h3><p>Ask a question or start a timed Study room with classmates.</p></li>
          <li><h3>Return to your work</h3><p>Find saved practice, learning progress, and eligible Aura awards in your workspace.</p></li>
        </ol>
        <p ref={statement} className="lp-statement" data-moment="word-highlight">Take a topic from a <strong>Learn checkpoint</strong> into your next <strong>practice interview.</strong></p>
      </section>
      <section className="lp-faq lp-section" id="eligibility" aria-labelledby="faq-title">
        <div><h2 id="faq-title">Hub eligibility and FAQs</h2><p>What to expect before you join.</p></div>
        <div>{faq.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div>
      </section>
      <section className="lp-final" aria-labelledby="join-title">
        <h2 id="join-title">Your college workspace</h2>
        <Link className="lp-button btn btn--primary" to={join('/dashboard')}>{returning ? 'Continue to your workspace' : 'Join your Hub'} <ArrowUpRight size={17} aria-hidden="true" /></Link>
        <p>Already have an account? <Link to="/login?returnTo=%2Fdashboard">Sign in</Link></p>
      </section>
    </main>
    <footer className="lp-footer" id="open-source"><div><Link className="lp-brand" to="/"><Braces size={22} aria-hidden="true" /> CollegeHubs</Link><p>Original project work is MIT licensed. Third-party notices retain their own terms.</p></div><nav aria-label="Source and project links"><a href={source}>Source repository ↗</a><a href={source + '/blob/main/LICENSE'}>Project license ↗</a><a href={source + '/blob/main/docs/THIRD_PARTY.md'}>Source acknowledgements ↗</a><Link to="/about">About the project</Link><a href="/privacy.html">Privacy notice</a></nav><div className="lp-motion"><h2>Motion preferences</h2><label><input type="checkbox" checked={motion.off} onChange={event => motion.setMotionOff(event.target.checked)} /> Turn decorative motion off</label><button aria-pressed={effect} disabled={!motion.motionAllowed} onClick={() => setEffect(!effect)}>{effect ? 'Disable optional background' : 'Try optional background'}</button><small>{motion.reduced ? 'System reduced-motion is respected.' : 'Static by default. The page works without graphics support.'}</small></div><p className="lp-footer-bottom">CollegeHubs <span>No institution endorsement implied.</span></p></footer>
  </div>;
}
