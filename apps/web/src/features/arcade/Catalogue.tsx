import React,{useEffect,useState} from 'react';
import { Link } from 'react-router-dom';
import { arcadeRequest,ArcadeError,type Game,type GameProps } from './api';
import { gameRegistry,gameRoute } from './gameRegistry';
export default function Catalogue({session,onExpired}:GameProps) {
  const [recent,setRecent]=useState<Game[]>([]),[available,setAvailable]=useState<string[]>([]),[busy,setBusy]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  useEffect(()=>{const abort=new AbortController();setRecent([]);setAvailable([]);setBusy(true);setError('');
    Promise.all([arcadeRequest('/games',{signal:abort.signal}),arcadeRequest('/me/activity',{signal:abort.signal})]).then(([games,activity])=>{if(!abort.signal.aborted){setAvailable(games.items.filter(game=>game.enabled).map(game=>game.id));setRecent(activity.items);}}).catch(err=>{if(!abort.signal.aborted){if(err instanceof ArcadeError&&err.status===401)onExpired();else setError(err.message||'Arcade is unavailable.');}}).finally(()=>{if(!abort.signal.aborted)setBusy(false);});return()=>abort.abort();
  },[session.userId,session.hubId,session.csrfToken,revision]);
  return <section className="stack"><p className="eyebrow">A little practice, every day</p><h1>Your Arcade.</h1><p>Three ranked games, one college community. Each first qualifying game per India day earns 5 Aura, up to three games per day.</p><p className="muted">Ranked games use saved, validated results. Casual play would earn zero; no casual games are released yet. Unavailable games cannot be started.</p>
    {busy&&<p role="status">Loading your Arcade...</p>}{error&&<p className="error" role="alert">{error}</p>}
    <button disabled={busy} onClick={()=>setRevision(n=>n+1)}>Refresh Arcade</button>
    <div className="arcade-catalogue">{gameRegistry.map(game=><article className="card stack" key={game.id}><div className="section-heading"><h2>{game.title}</h2><span className="pill">{game.status==='unavailable'?'Unavailable':available.includes(game.id)?'Ranked':busy?'Loading':'Unavailable'}</span></div><p>{game.description}</p>{available.includes(game.id)&&game.status!=='unavailable'?<Link className="arcade-play" to={game.path}>Play {game.title}</Link>:<p className="muted">{game.status==='unavailable'?'Not released. No Aura.':'New rounds are currently unavailable.'}</p>}</article>)}</div>
    <h2>Your recent rounds</h2>{!busy&&!error&&!recent.length&&<p>No saved rounds yet.</p>}
    <ul className="arcade-history">{recent.map(row=><li key={row.id}><Link to={(gameRoute(row.gameId)?.path||'/arcade')+'/'+row.id}>{gameRoute(row.gameId)?.title||'Game'} - {row.status.replaceAll('_',' ')}{row.receipt?' - +'+row.receipt.awardedAura+' Aura':row.deliveryStatus==='pending'?' - Aura pending':''}</Link></li>)}</ul>
  </section>;
}
