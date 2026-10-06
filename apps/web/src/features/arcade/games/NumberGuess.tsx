// Ported from legacy/digital-arcade-main: attempts, higher/lower hints and guess history.
// The Arcade service owns the target, transitions, deadline and completion.
import React,{useState} from 'react';
import {type GameProps} from '../api';
import {useServerGame} from '../useServerGame';
import GameFrame from '../GameFrame';
const hintText:Record<string,string>={higher:'Too low - try higher.',lower:'Too high - try lower.',correct:'You found it!',finished:'All ten guesses used.'};
export default function NumberGuess(props:GameProps) {
  const round=useServerGame('numberguess',props),{game,busy,pending}=round;
  const [guess,setGuess]=useState(''),[validation,setValidation]=useState('');
  function submit(event:React.FormEvent){event.preventDefault();if(!game||pending)return;if(!/^\d+$/.test(guess)||Number(guess)<1||Number(guess)>100){setValidation('Enter a whole number from 1 to 100.');return;}setValidation('');void round.action({guess:Number(guess)}).then(()=>setGuess(''));}
  return <GameFrame round={round} title="NumberGuess" description="Find a number from 1 to 100 in ten guesses. Each round expires after ten minutes.">
    {validation&&<p role="alert" className="error">{validation}</p>}
    {game&&<div className="card stack"><div className="section-heading"><h2>{game.status==='won'?'You found it!':game.status==='lost'?'Ten guesses used':game.status==='expired'?'Time is up':'Make your next guess'}</h2><span className="pill">{game.actions.length} / 10 attempts</span></div>
      <p className="muted">Expires {new Date(game.expiresAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST.</p>
      {game.status==='active'&&<form className="arcade-guess" onSubmit={submit}><label htmlFor="number-guess">Your guess<input id="number-guess" type="number" inputMode="numeric" min="1" max="100" step="1" value={guess} onChange={event=>setGuess(event.target.value)} disabled={busy||!!pending}/></label><button className="primary" disabled={busy||!!pending||!guess}>Guess</button></form>}
      <p role="status">{game.actions.length?hintText[game.actions.at(-1)!.hint]:'Your guesses stay saved when you reload.'}</p>
      <ol className="arcade-history">{game.actions.map(action=><li key={action.seq}>Guess {action.seq}: <strong>{action.guess}</strong> - {hintText[action.hint]}</li>)}</ol>
    </div>}
  </GameFrame>;
}
