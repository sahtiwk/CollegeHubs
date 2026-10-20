import React,{useEffect,useState} from 'react';
import api from '../api';
export default function ExternalProgress(){
  const [data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[handle,setHandle]=useState(''),[revision,setRevision]=useState(0);
  useEffect(()=>{const abort=new AbortController();api.get('/me/external-accounts',{signal:abort.signal}).then(r=>{if(!abort.signal.aborted)setData(r.data);}).catch(()=>{if(!abort.signal.aborted)setError('External progress could not be loaded.');});return()=>abort.abort();},[revision]);
  async function act(work){setBusy(true);setError('');try{await work();setRevision(n=>n+1);}catch(e){setError(e.response?.data?.error?.message||'External progress could not be updated. Try again.');}finally{setBusy(false);}}
  return <section className="card stack" aria-label="External progress"><div className="section-heading"><div><p className="eyebrow">BEYOND CAMPUS / VERIFIED BY YOU</p><h2>Your external progress</h2></div><button disabled={busy} onClick={()=>{setError('');setRevision(n=>n+1);}}>Refresh linked accounts</button></div>
    <p>Link your own profile. A handle alone proves no ownership and earns no Aura. Statistics are private to you here.</p>
    {error&&<p role="alert">{error}</p>}{!data&&!error&&<p role="status">Loading provider availability…</p>}
    {data?.capabilities.map(cap=>{const account=data.items.find(r=>r.provider===cap.provider);return <article className="stack" key={cap.provider}>
      <h3>{cap.name}</h3><p>{cap.reason}</p>
      {account&&<><p><strong>{account.handle}</strong> · {account.status==='verified'?'Ownership verified':'Awaiting ownership review'}</p>
        {account.status==='pending'&&<div className="schedule-notice"><p>To demonstrate control, temporarily set the Organization field on your Codeforces profile to this exact code. Ask your installation’s operator to review it before it expires. After verification, restore your organization.</p><code style={{overflowWrap:'anywhere'}}>{account.challenge}</code><p>Expires {new Date(account.challengeExpiresAt).toLocaleString()}.</p><small>Review reference: {account.id} / binding {account.bindingVersion}</small></div>}
        {account.snapshot?<><p>Current rating: <strong>{account.snapshot.rating}</strong> · <a href={account.snapshot.sourceUrl} target="_blank" rel="noreferrer">Provider profile</a></p><p>Last successful update: {new Date(account.snapshot.fetchedAt).toLocaleString()}. {account.snapshot.stale?'Stale — showing the last saved snapshot.':'Saved snapshot.'}</p></>:<p>No verified statistics snapshot yet.</p>}
        <p>Recorded external Aura: {account.appliedBonus}. {!cap.bonusEnabled&&'New external bonuses are disabled. Any previously recorded bonus remains until a refresh or unlink reconciles it.'}</p>
        {account.lastError&&<p role="status">The latest provider check did not complete. Saved statistics are retained. Check the profile proof or retry after the cooldown.</p>}
        <div className="schedule-toolbar">{cap.enabled&&account.status==='verified'&&<button disabled={busy} onClick={()=>act(()=>api.post('/me/external-accounts/codeforces/refresh',{}))}>Update Codeforces statistics</button>}<button disabled={busy} onClick={()=>act(()=>api.delete('/me/external-accounts/'+cap.provider))}>Unlink {cap.name}</button></div>
        <small>Unlinking removes this binding’s external Aura, while keeping your campus engagement points.</small>
      </>}
      {cap.enabled&&<form className="schedule-toolbar" onSubmit={e=>{e.preventDefault();act(()=>api.post('/me/external-accounts',{provider:cap.provider,handle}));}}><label>Codeforces handle<input value={handle} onChange={e=>setHandle(e.target.value)} minLength={3} maxLength={24} required autoComplete="off" disabled={busy}/></label><button disabled={busy}>{account?'Change handle / renew expired proof':'Link for ownership review'}</button></form>}
    </article>;})}
  </section>;
}
