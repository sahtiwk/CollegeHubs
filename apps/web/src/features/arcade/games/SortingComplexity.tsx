import React,{useState} from 'react';
import {type GameProps} from '../api';
import {useServerGame} from '../useServerGame';
import {useDeadline} from '../useDeadline';
import GameFrame from '../GameFrame';
export default function SortingComplexity(props:GameProps) {
  const round=useServerGame('sorting',props),{game,busy,pending}=round,{remaining}=useDeadline(game);
  const [choice,setChoice]=useState('');const state=game?.sorting,playing=game?.status==='active'&&remaining>0;
  function submit(event:React.FormEvent){event.preventDefault();if(choice&&!pending)void round.action({type:'complexity',choice});}
  return <GameFrame round={round} title="Sorting Complexity" description="Bubble-sort six values using the highlighted adjacent pair. Compare first, swap only when needed, and complete every pass. Then choose the worst-case time complexity. Each round expires after ten minutes.">
    {game&&state&&<div className="card stack"><div className="section-heading"><h2>{game.status==='won'?'Trace complete!':game.status==='expired'||remaining===0?'Time is up':state.traceComplete?'Choose the complexity':'Work through the next pair'}</h2><span className="pill">{state.comparisons} comparisons · {state.swaps} swaps</span></div>
      <ol className="arcade-array" aria-label="Current sorting array">{state.array.map((value,index)=><li key={index} className={playing&&!state.traceComplete&&(index===state.index||index===state.index+1)?'arcade-selected':''}><span className="muted">Position {index+1}</span><strong>{value}</strong></li>)}</ol>
      {playing&&!state.traceComplete&&<><p role="status">Pass {state.pass+1} of 5. {state.needsSwap?'The left value is greater. Swap this pair.':'Compare positions '+(state.index+1)+' and '+(state.index+2)+'.'}</p><div className="arcade-controls"><button className="primary" disabled={busy||!!pending||state.needsSwap} onClick={()=>void round.action({type:'compare',left:state.index,right:state.index+1})}>Compare highlighted pair</button><button disabled={busy||!!pending||!state.needsSwap} onClick={()=>void round.action({type:'swap',left:state.index,right:state.index+1})}>Swap highlighted pair</button></div></>}
      {playing&&state.traceComplete&&<form className="stack" onSubmit={submit}><fieldset className="arcade-complexity"><legend>Worst-case time complexity of this bubble sort</legend>{[['linear','O(n) - linear'],['linearithmic','O(n log n) - linearithmic'],['quadratic','O(n²) - quadratic']].map(([value,label])=><label key={value}><input type="radio" name="complexity" value={value} checked={choice===value} onChange={()=>setChoice(value)} disabled={busy||!!pending}/>{label}</label>)}</fieldset><button className="primary" disabled={busy||!!pending||!choice}>Check complexity</button></form>}
      {game.status==='won'&&<p>Correct: quadratic, O(n²). The full trace uses n(n − 1)/2 comparisons; six values require 15. Increasing the input grows the work quadratically.</p>}
      <details className="arcade-trace"><summary>Saved trace: {game.actions.length} actions</summary><ol className="arcade-history">{game.actions.map(action=><li key={action.seq}>{action.type==='complexity'?'Complexity: '+action.choice:action.type+' positions '+(action.left+1)+' and '+(action.right+1)}</li>)}</ol></details>
    </div>}
  </GameFrame>;
}
