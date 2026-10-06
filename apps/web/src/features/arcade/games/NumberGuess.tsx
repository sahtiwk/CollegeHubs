// Ported from legacy/digital-arcade-main: attempts, higher/lower hints and guess history.
// The Arcade service now owns the target, transitions, deadline and completion.
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { arcadeRequest, ArcadeError, type ArcadeSession, type Game } from '../api';
const hintText: Record<string,string> = { higher:'Too low — try higher.', lower:'Too high — try lower.', correct:'You found it!', finished:'All ten guesses used.' };
export default function NumberGuess({session,onExpired}:{session:ArcadeSession;onExpired:()=>void}) {
  const {id} = useParams(); const navigate=useNavigate();
  const [game,setGame]=useState<Game|null>(null),[recent,setRecent]=useState<Game[]>([]),[guess,setGuess]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[attempt,setAttempt]=useState(0);
  const [pending,setPending]=useState<{path:string;body:unknown}|null>(null);const createId=useRef(crypto.randomUUID());
  useEffect(()=>{const abort=new AbortController();setGame(null);setRecent([]);setError('');setPending(null);setGuess('');setBusy(true);
    arcadeRequest(id?'/sessions/'+id:'/me/activity',{signal:abort.signal}).then(data=>{if(!abort.signal.aborted){if(id)setGame(data.game);else setRecent(data.items);}}).catch(err=>{if(!abort.signal.aborted){if(err instanceof ArcadeError&&err.status===401)onExpired();else setError(err.message||'Arcade could not be loaded.');}}).finally(()=>{if(!abort.signal.aborted)setBusy(false);});return()=>abort.abort();
  },[id,session.userId,session.hubId,session.csrfToken,attempt]);
  const generation=useRef(0);useEffect(()=>{generation.current++;return()=>{generation.current++;};},[id,session.userId,session.hubId]);
  async function send(request:{path:string;body:unknown}) {const version=generation.current;setBusy(true);setError('');setPending(request);
    try{const data=await arcadeRequest(request.path,{method:'POST',body:request.body,csrf:session.csrfToken});if(version!==generation.current)return;setPending(null);setGuess('');if(request.path==='/sessions'){createId.current=crypto.randomUUID();navigate('/arcade/numberguess/'+data.game.id);}else setGame(data.game);}
    catch(err){if(version!==generation.current)return;if(err instanceof ArcadeError&&err.status===401){onExpired();return;}if(err instanceof ArcadeError&&err.status<500){setPending(null);setError(err.message+' Reload the saved game to continue.');}else setError('Save unconfirmed. Retry the same request or reload the saved game.');}
    finally{if(version===generation.current)setBusy(false);}
  }
  function submit(event:React.FormEvent){event.preventDefault();if(!game||pending)return;if(!/^\d+$/.test(guess)||Number(guess)<1||Number(guess)>100){setError('Enter a whole number from 1 to 100.');return;}void send({path:'/sessions/'+game.id+'/actions',body:{seq:game.actions.length+1,guess:Number(guess)}});}
  return <section className="stack arcade-game"><p className="eyebrow">Play, think, improve</p><h1>NumberGuess.</h1><p>Find a number from 1 to 100 in ten guesses. Each game expires after ten minutes. Your first successful game each India calendar day can earn 5 Aura.</p>
    <p className="muted">MathAmplitude and sorting are not available yet.</p>
    {busy&&<p role="status">Loading or saving your game…</p>}
    {error&&<p className="error" role="alert">{error}</p>}
    {pending&&!busy&&<button onClick={()=>void send(pending)}>Retry same request</button>}
    <button disabled={busy} onClick={()=>setAttempt(n=>n+1)}>Reload saved {id?'game':'activity'}</button>
    {game&&<div className="card stack"><div className="section-heading"><h2>{game.status==='won'?'You found it!':game.status==='lost'?'Ten guesses used':game.status==='expired'?'Time is up':'Make your next guess'}</h2><span className="pill">{game.actions.length} / 10 attempts</span></div>
      <p className="muted">Expires {new Date(game.expiresAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST.</p>
      {game.status==='active'&&<form className="arcade-guess" onSubmit={submit}><label htmlFor="number-guess">Your guess<input id="number-guess" type="number" inputMode="numeric" min="1" max="100" step="1" value={guess} onChange={event=>setGuess(event.target.value)} disabled={busy||!!pending}/></label><button className="primary" disabled={busy||!!pending||!guess}>Guess</button></form>}
      <p role="status">{game.actions.length?hintText[game.actions.at(-1)!.hint]:'Your guesses stay saved when you reload.'}</p>
      <ol className="arcade-history">{game.actions.map(action=><li key={action.seq}>Guess {action.seq}: <strong>{action.guess}</strong> — {hintText[action.hint]}</li>)}</ol>
      {game.deliveryStatus==='pending'&&<p role="status">Win saved; Aura pending. Reload later to check the receipt.</p>}
      {game.receipt&&<p role="status">Aura recorded: +{game.receipt.awardedAura} ({game.receipt.reason.replaceAll('_',' ')}).</p>}
      {['lost','expired'].includes(game.status)&&<p>No Aura for this game. Try again when you are ready.</p>}
      <Link to="/arcade">Back to Arcade</Link>
    </div>}
    {!id&&<><button className="primary" disabled={busy||!!pending} onClick={()=>void send({path:'/sessions',body:{gameId:'numberguess',clientSessionId:createId.current}})}>Start NumberGuess</button><h2>Your recent games</h2>{!busy&&!error&&!recent.length&&<p>No games yet. Start your first one.</p>}<ul className="arcade-history">{recent.map(row=><li key={row.id}><Link to={'/arcade/numberguess/'+row.id}>NumberGuess · {row.status} · {row.actions.length} guesses</Link></li>)}</ul></>}
  </section>;
}
