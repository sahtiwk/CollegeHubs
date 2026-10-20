import React, { useEffect, useRef, useState } from 'react';
import api from '../api';
import { useAuth } from '../auth/AuthProvider';
export default function WeakSkillSuggestions({ interviewId, request, savedTopics = [], disabled = false, onBusy, onSaved }) {
  const { user } = useAuth();
  const [items,setItems] = useState(null), [selected,setSelected] = useState([]), [busy,setBusy] = useState(false), [notice,setNotice] = useState('');
  const lifetime = useRef(null);
  useEffect(() => { const controller=new AbortController(); lifetime.current=controller; setItems(null); setSelected([]); setNotice(''); setBusy(false); onBusy(false); return ()=>controller.abort(); },[user._id,user.hubId,user.membershipVersion,interviewId]);
  async function perform(work) { const signal=lifetime.current.signal; if(signal.aborted)return;setBusy(true);onBusy(true);setNotice('');try{await work(signal);}catch(e){if(!signal.aborted)setNotice(e.response?.data?.error?.message || e.message || 'Suggestions are unavailable. Continue without them.');}finally{if(!signal.aborted){setBusy(false);onBusy(false);}} }
  const load=()=>perform(async signal=>{const {data}=await api.get('/me/weak-skills',{signal});if(!signal.aborted){setItems(data.items);setSelected([]);}});
  const apply=()=>perform(async signal=>{
    // Warm/renew Interview first; only then start the one-minute Core recommendation lifetime.
    await request('/capabilities');if(signal.aborted)return;
    const {data}=await api.post('/me/interview-recommendation',{nodeIds:selected},{signal});if(signal.aborted)return;
    await request('/interviews/'+interviewId+'/learn-topics','POST',{recommendationRef:data.recommendationRef});if(signal.aborted)return;
    setSelected([]);setNotice('Selected topics saved. They will guide your next question generation.');onSaved();
  });
  return <section className="stack learn-topic-suggestions" aria-label="Optional Learn topics" aria-busy={busy}>
    <h2>Practise topics from Learn</h2><p>Optional: choose up to five topics whose latest assessment scored below 60% in the last 30 days. This is a simple practice suggestion, not a calibrated measure of ability. Unassessed topics are excluded.</p>
    <p className="muted">Selected topic labels will be sent to the configured provider with your role details when you generate questions. You can generate normally without selecting any.</p>
    {!!savedTopics.length && <div><strong>Saved practice topics</strong><ul>{savedTopics.map(t=><li key={t.nodeId}>{t.label}</li>)}</ul><p>To practise without these saved topics, create a new interview setup.</p></div>}
    <button type="button" disabled={busy||disabled} onClick={load}>{items ? 'Refresh topic suggestions' : 'Show my Learn suggestions'}</button>
    {items && (items.length ? <fieldset disabled={busy||disabled}><legend>Choose topics to include</legend>{items.map(t=><label className="interview-check" key={t.nodeId}><input type="checkbox" checked={selected.includes(t.nodeId)} onChange={e=>setSelected(old=>e.target.checked?[...old,t.nodeId]:old.filter(id=>id!==t.nodeId))}/><span>{t.label}<small>{t.domain ? ` · ${t.domain} / ${t.version}` : ` · ${t.version}`} · Assessed {new Date(t.asOf).toLocaleDateString()} · {t.reason}</small></span></label>)}</fieldset> : <p>No recent assessed topics meet this rule. You can continue with normal interview practice.</p>)}
    {!!selected.length && <button type="button" disabled={busy||disabled} onClick={apply}>Use {selected.length} selected topic{selected.length===1?'':'s'}</button>}
    {notice && <p role="status">{notice}</p>}
  </section>;
}
