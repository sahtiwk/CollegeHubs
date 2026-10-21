import React, {useEffect, useRef, useState} from 'react';
import {GoogleOAuthProvider, useGoogleLogin} from '@react-oauth/google';
import api, {getSessionKey} from '../api';
const base='/me/calendar-sync', options={headers:{'X-Requested-With':'XmlHttpRequest'}};
export default function GoogleCalendarSync({channelId}) {
  const [state,setState]=useState(null),[error,setError]=useState('');
  const active=useRef(true),session=getSessionKey();
  useEffect(()=>{active.current=true;const load=()=>api.get(base).then(({data})=>{if(active.current&&session===getSessionKey())setState(data);}).catch(()=>{if(active.current)setError('Calendar connection status unavailable.');});void load();const timer=setInterval(load,60000);return()=>{active.current=false;clearInterval(timer);};},[session]);
  if(!state?.available)return error?<p className="muted">{error}</p>:null;
  return <GoogleOAuthProvider clientId={state.clientId}><Controls channelId={channelId} state={state} setState={data=>{if(active.current&&session===getSessionKey())setState(data);}} session={session}/></GoogleOAuthProvider>;
}
function Controls({channelId,state,setState,session}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[nonce,setNonce]=useState('');
  const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const current=()=>mounted.current&&getSessionKey()===session;
  async function action(path,body={}) {
    if(!current())return;
    setBusy(true);setError('');
    try{const {data}=await api.post(base+path,body,options);if(current()){setState(data);if(path==='/disconnect'||path==='/connect')setNonce('');}}
    catch(e){if(current()){setError(e.response?.data?.error?.message||'Calendar connection failed. Please retry.');if(path==='/connect')setNonce('');}}
    finally{if(current())setBusy(false);}
  }
  const authorize=useGoogleLogin({flow:'auth-code',scope:'https://www.googleapis.com/auth/calendar.app.created',overrideScope:true,include_granted_scopes:false,
    onSuccess:response=>{if(current())void action('/connect',{nonce,code:response.code});},
    onError:()=>{if(current())setError('Google Calendar permission was not granted.');},
    onNonOAuthError:()=>{if(current())setError('The Google window was closed or blocked. You can try again.');},
  });
  async function prepare(){setBusy(true);setError('');try{const {data}=await api.post(base+'/start',{channelId},options);if(current())setNonce(data.nonce);}catch(e){if(current())setError(e.response?.data?.error?.message||'Could not prepare calendar connection.');}finally{if(current())setBusy(false);}}
  const connected=state.state==='connected';
  return <div className="schedule-export"><h3>Google Calendar</h3>
    <p>Keep reviewed dates for one subject in a separate CollegeHubs calendar. Updates run about every 15 minutes while the service is awake; the free server can sleep and delay updates. Your personal calendars stay private.</p>
    {connected?<><p>Connected{String(state.channelId)!==String(channelId)?' to another subject':''}. {state.lastSyncedAt?'Last full sync: '+new Date(state.lastSyncedAt).toLocaleString():'First sync pending.'}</p><button disabled={busy} onClick={()=>action('/refresh')}>Request sync</button><button disabled={busy} onClick={()=>action('/disconnect')}>Disconnect</button><p className="muted">Disconnect stops future updates and removes the saved connection token. Your Google calendar copy stays available. A write already in progress may finish.</p></>:<>{nonce?<button disabled={busy} onClick={()=>authorize()}>Continue with Google</button>:<button disabled={busy} onClick={prepare}>{busy?'Preparing…':'Connect this subject'}</button>}</>}
    {state.lastError&&<p role="status">The last sync did not finish. {state.state==='reconnect'?'Disconnect and reconnect to restore access.':'Automatic retry is pending.'}</p>}
    {!connected&&state.state==='reconnect'&&<button disabled={busy} onClick={()=>action('/disconnect')}>Clear old connection</button>}
    {error&&<p role="alert">{error}</p>}
  </div>;
}
