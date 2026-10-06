// Ported from legacy MathAmplitude: arithmetic round, score, feedback and 60-second clock.
// Private questions, grading and result authority now belong to the Arcade service.
import React,{useState} from 'react';
import {type GameProps} from '../api';
import {useServerGame} from '../useServerGame';
import {useDeadline} from '../useDeadline';
import GameFrame from '../GameFrame';
const symbols:Record<string,string>={'+':'+','-':'−','*':'×','/':'÷'};
const hints:Record<string,string>={correct:'Correct! Next question.',try_again:'Try again. This question allows three attempts.',skipped:'Three attempts used. Moving to the next question.'};
export default function MathAmplitude(props:GameProps) {
  const round=useServerGame('mathamplitude',props),{game,busy,pending}=round,{remaining,elapsed}=useDeadline(game);
  const [answer,setAnswer]=useState(''),[validation,setValidation]=useState('');
  const question=game?.math?.currentQuestion,playing=game?.status==='active'&&remaining>0;
  function submit(event:React.FormEvent){event.preventDefault();if(!question||!playing||pending)return;if(!/^-?\d+$/.test(answer)||!Number.isSafeInteger(Number(answer))||Math.abs(Number(answer))>1000){setValidation('Enter a whole-number answer between -1000 and 1000.');return;}setValidation('');void round.action({questionId:question.id,answer:Number(answer)}).then(()=>setAnswer(''));}
  return <GameFrame round={round} title="MathAmplitude" description="Solve arithmetic in a 60-second round. Five correct answers and at least 30 seconds of play qualify. Three wrong attempts move to the next question.">
    {validation&&<p role="alert" className="error">{validation}</p>}
    {game&&<div className="card stack"><div className="section-heading"><h2>{['won','lost'].includes(game.status)?'Round complete':remaining===0?'Time is up':'Your next calculation'}</h2><span className="pill">Correct: {game.math.correctCount}</span></div>
      {['active','awaiting_completion'].includes(game.status)&&<p className="arcade-clock" aria-label="Time remaining">{remaining}s remaining</p>}
      {playing&&question&&<form className="stack" onSubmit={submit}><p className="arcade-question" aria-label="Arithmetic question">{question.num1} {symbols[question.operation]} {question.num2} = ?</p><div className="arcade-guess"><label htmlFor="math-answer">Your answer<input id="math-answer" type="number" inputMode="numeric" step="1" value={answer} onChange={event=>setAnswer(event.target.value)} disabled={busy||!!pending}/></label><button className="primary" disabled={busy||!!pending||!answer}>Check answer</button></div></form>}
      {playing&&!question&&<p>All 40 questions have been attempted. Finish to save your result.</p>}
      {playing&&game.actions.length>0&&<p role="status">{hints[game.actions.at(-1)!.hint]}</p>}
      {['active','awaiting_completion'].includes(game.status)&&<><p className="muted">{remaining===0?'Answers are closed. Finish your saved round to record its result.':elapsed<30?'You can finish after 30 seconds.':'You can keep solving until time runs out, or finish now.'}</p><button disabled={busy||!!pending||elapsed<30} onClick={()=>void round.complete()}>Finish round</button></>}
      {game.status==='won'&&<p>You qualified with {game.math.correctCount} correct answers.</p>}{game.status==='lost'&&<p>Five correct answers are needed to qualify. Your answers are saved.</p>}
      <h3>Recent answers</h3><ol className="arcade-history">{game.actions.slice(-10).map(action=><li key={action.seq}>Attempt {action.seq}: {action.answer} - {action.correct?'Correct':action.hint==='skipped'?'Question skipped':'Try again'}</li>)}</ol>
    </div>}
  </GameFrame>;
}
