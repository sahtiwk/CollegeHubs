import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import api from '../api';
import AuraCard from '../components/AuraCard';
import AuraTicker from '../components/AuraTicker';
import LearnProgressCard from '../components/LearnProgressCard';
import ExternalProgress from '../components/ExternalProgress';
import '../styles/progress.css';
function Badges() {
  const [state, setState] = useState({items:[],loading:true,error:''}), [attempt,setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState(old => ({...old,loading:true,error:''}));
    api.get('/me/aura/achievements',{signal:controller.signal}).then(({data}) => { if (!controller.signal.aborted) setState({items:data.items,loading:false,error:''}); }).catch(() => { if (!controller.signal.aborted) setState(old => ({...old,loading:false,error:'Badges could not be loaded. Your recorded progress is safe.'})); });
    return () => controller.abort();
  },[attempt]);
  return <section className="stack"><div className="section-heading"><div><p className="eyebrow">SMALL STEPS / SOMETHING TO KEEP</p><h2>Your achievements</h2></div><button disabled={state.loading} onClick={()=>setAttempt(value=>value+1)}>Refresh badges</button></div><p>Badges recognise verified activity. They add no Aura points. Earlier eligible records can earn a badge without changing their original rewards.</p>
    {state.loading && <p role="status">Checking achievements...</p>}{state.error && <p role="alert">{state.error}</p>}
    <ul className="achievement-grid">{state.items.map(badge=><li className={'card achievement '+(badge.earned?'earned':'')} key={badge.id}><span className="eyebrow">{badge.earned?'EARNED':'NOT YET EARNED'}</span><h3>{badge.name}</h3><p>{badge.description}</p>{badge.earnedAt && <small>Qualified {new Date(badge.earnedAt).toLocaleDateString()}</small>}</li>)}</ul>
  </section>;
}
function History() {
  const [items,setItems]=useState([]),[cursor,setCursor]=useState(null),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[error,setError]=useState('');
  const generation=useRef(0);
  async function load(next=null) {
    const id=++generation.current;setBusy(true);setError('');
    try { const {data}=await api.get('/me/aura/history',{params:{limit:20,...(next?{cursor:next}:{})}});if(id!==generation.current)return;setItems(old=>next?[...old,...data.items.filter(row=>!old.some(item=>item.eventId===row.eventId))]:data.items);setCursor(data.nextCursor);setLoaded(true); }
    catch {if(id===generation.current)setError('Reward history could not be loaded. Try again.');}
    finally {if(id===generation.current)setBusy(false);}
  }
  useEffect(()=>{load();return()=>{generation.current++;};},[]);
  return <section className="card stack"><div className="section-heading"><h2>Your reward history</h2><button disabled={busy} onClick={()=>load()}>Refresh history</button></div><p className="muted">Newest recorded receipts first. Zero-point and partial awards remain visible; duplicate deliveries are omitted. Unscored historical contributions and pending completions are explained in Your Aura above.</p>
    {error && <p role="alert">{error} <button disabled={busy} onClick={()=>load(cursor)}>Retry history</button></p>}
    {items.length>0 && <AuraTicker receipts={items} title="Recorded rewards" />}
    {busy && <p role="status">Loading reward history...</p>}{loaded && !busy && !error && !items.length && <p>No reward receipts yet. Your first scored activity will appear here.</p>}
    {cursor && <button disabled={busy} onClick={()=>load(cursor)}>Older rewards</button>}
  </section>;
}
export default function Progress() {
  const {user}=useAuth();
  return <section className="stack progress-page" key={user._id+':'+user.hubId}><div><p className="eyebrow">EFFORT YOU CAN SEE</p><h1>A little further,<br/><em>every day.</em></h1><p>Follow your contributions, understand your rewards, and find your next milestone.</p></div><AuraCard /><LearnProgressCard /><Badges /><ExternalProgress /><History /><Link to="/dashboard#workspace-progress">Return to learning and practice</Link></section>;
}
