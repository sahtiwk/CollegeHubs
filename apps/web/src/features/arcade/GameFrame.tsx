import React from 'react';
import { Link } from 'react-router-dom';
import { useServerGame } from './useServerGame';
export type Round = ReturnType<typeof useServerGame>;
export default function GameFrame({round,title,description,children}:{round:Round;title:string;description:string;children?:React.ReactNode}) {
  const {game,busy,error,pending}=round;
  const closed=game&&['won','lost','expired'].includes(game.status);
  return <section className="stack arcade-game"><p className="eyebrow">Play, think, improve</p><h1>{title}.</h1><p>{description}</p>
    <p className="muted">Ranked: your first qualifying completion of this game each India calendar day can earn 5 Aura. Repeat completions earn zero.</p>
    {busy&&<p role="status">Loading or saving your round...</p>}
    {error&&<p className="error" role="alert">{error}</p>}
    {pending&&!busy&&<button onClick={()=>void round.retry()}>Retry same request</button>}
    {round.hasSavedGame&&<button disabled={busy} onClick={round.reload}>Reload saved game</button>}
    {!game&&!busy&&!error&&<button className="primary" disabled={!!pending} onClick={()=>void round.start()}>Start {title}</button>}
    {children}
    {game?.deliveryStatus==='pending'&&<p role="status">Result saved; Aura pending. Reload later to check the receipt.</p>}
    {game?.receipt&&<p role="status">Aura recorded: +{game.receipt.awardedAura} ({game.receipt.reason.replaceAll('_',' ')}).</p>}
    {closed&&game.status!=='won'&&<p>No Aura for this round. Try again when you are ready.</p>}
    {closed&&<button className="primary" disabled={busy||!!pending} onClick={()=>void round.start()}>Play again</button>}
    <Link to="/arcade">Back to Arcade</Link>
  </section>;
}
