import React from 'react';
import { Link } from 'react-router-dom';

const features = [
  ['College community', 'College-scoped feeds, channels, code and resource sharing, answer threads and college rankings.'],
  ['Study together', 'Timed rooms with private saved drafts, reconnect recovery and comparison after the deadline. Code is not executed or judged.'],
  ['One Aura balance', 'Eligible contributions and module results earn server-verified Aura under daily limits. Badges reflect verified activity. External progress and bonuses depend on provider availability and verified ownership.'],
  ['Arcade', 'NumberGuess, MathAmplitude, Sorting Complexity and Spot the Bug use server-validated actions. Daily challenges have a shared reward cap and a saved result.'],
  ['Interview practice', 'Upload a PDF resume, answer five questions and receive AI practice feedback. Saved extracted text can be deleted; no public PDF link is created. Feedback is heuristic.'],
  ['Learn', 'Five learning paths cover DSA, Web Development, Machine Learning, Backend Engineering and DevOps, with readings, assessments and optional review. These are starter curricula, not certified assessments.'],
  ['Schedules', 'Cached contests and college academic events, with samples clearly labelled. Download a month as a calendar file to import into your calendar app; it is a snapshot, not automatic synchronization. Stale or unavailable providers are disclosed.'],
];

export default function AboutPage() {
  return <main className="release-about">
    <style>{`
      .release-about { max-width: 1000px; margin: auto; padding: 32px 20px; color: var(--text); }
      .release-about h1, .release-about h2 { color: var(--text); }
      .release-about h1 { font-family: var(--font-sans); font-size: clamp(30px, 6vw, 48px); }
      .release-about p { line-height: 1.7; }
      .release-about a { color: var(--accent); text-decoration: underline; }
      .release-about a:focus-visible { outline: 3px solid var(--accent); outline-offset: 4px; }
      .release-about-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); gap: 16px; margin: 24px 0; }
      .release-about article, .release-about aside { padding: 20px; background: var(--surface-raised); border: 1px solid var(--border); border-radius: 16px; }
      .release-about article h2 { font-size: 20px; margin-top: 0; }
    `}</style>
    <Link to="/">Back to CollegeHubs</Link>
    <h1>One college community. More ways to learn.</h1>
    <p>CollegeHubs brings community, Study Rooms, Arcade, Interview practice and Learn into one shared app.</p>
    <div className="release-about-grid">{features.map(([title, description]) =>
      <article key={title}><h2>{title}</h2><p>{description}</p></article>)}</div>
    <aside aria-label="Demo limitations">
      <h2>About this free demo</h2>
      <p>Services may sleep between visits. Startup can take time; if a request fails, reconnect or retry. A saved result may show Aura pending until delivery recovers. Availability is subject to free hosting and AI quotas.</p>
      <p>Hub membership requires verified email ownership and an exact configured college domain. Mail and Google sign-in availability depend on deployment configuration. College branding does not imply official college endorsement.</p>
      <p>Save Study drafts and Interview answers before leaving. Acknowledged saves are retained on the server; supported unsent drafts can be recovered in the same tab for 24 hours. Progress summaries may be temporarily unavailable while services wake up. Learn-based Interview topics are optional practice suggestions, not a calibrated assessment.</p>
    </aside>
    <h2>Source acknowledgements</h2>
    <p>Built from SocialStream, Digital Arcade, AI Interviewer and MargaAI source integrations. Original SocialStream credits include Shaik Safiullah Sahil Hussain and Anugu Samhith Reddy; AI Interviewer credits Aftab Alam and Contributors. Source notices and adaptation records are retained in the repository. Linked readings retain their publishers’ attribution.</p>
  </main>;
}
