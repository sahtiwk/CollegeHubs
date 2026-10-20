import { useDeadline } from './useDeadline';
import React from 'react';
import { Link } from 'react-router-dom';
import { useServerGame } from './useServerGame';
export type Round = ReturnType<typeof useServerGame>;
export default function GameFrame({round,title,description,children}:{round:Round;title:string;description:string;children?:React.ReactNode}) {
  const {game,busy,error,pending}=round;
  const {remaining}=useDeadline(game);
  const closed=game&&['won','lost','expired'].includes(game.status);
  return <section className="stack arcade-game"><p className="eyebrow">Play, think, improve</p><h1>{title}.</h1><p>{description}</p>
    <div className="arcade-rule-strip"><span className="pill">{round.daily?'Daily · up to 15 Aura':'Ranked · up to 5 Aura'}</span><p>{round.daily?'One attempt per India day. The daily reward replaces this round’s ordinary reward.':'Your first qualifying completion of this game each India day can earn 5 Aura. Repeats earn zero.'} Arcade rewards share a 30-Aura daily cap.</p></div>
    {game?.daily&&<p role="status">{game.daily.stale?'Past daily challenge':'Daily challenge'} · {game.daily.challengeDay}. Ends at midnight IST or the round deadline, whichever comes first.</p>}
    {busy&&<p role="status">Loading or saving your round...</p>}
    {error&&<p className="error" role="alert">{error}</p>}
    {pending&&!busy&&<button onClick={()=>void round.retry()}>Retry same request</button>}
    {round.hasSavedGame&&<button disabled={busy} onClick={round.reload}>Reload saved game</button>}
    {!round.daily&&!game&&!busy&&!error&&<button className="primary" disabled={!!pending} onClick={()=>void round.start()}>Start {title}</button>}
    {game?.status==='active'&&<p className="pill">{remaining>0?`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')} remaining`:'Time is up. Reload to see your saved result.'}</p>}
    {children}
    {game?.deliveryStatus==='pending'&&<p role="status">Result saved; Aura pending. Reload later to check the receipt.</p>}
    {game?.deliveryStatus==='attention'&&<p role="status">Your result is saved. Reward delivery needs operator review; replaying the game will not repair this receipt.</p>}
    {game?.receipt&&<p role="status">Aura recorded: +{game.receipt.awardedAura} ({game.receipt.reason.replaceAll('_',' ')}).</p>}
    {closed&&game.status!=='won'&&<p>No Aura for this round. Try again when you are ready.</p>}
    {closed&&!round.daily&&<button className="primary" disabled={busy||!!pending} onClick={()=>void round.start()}>Play again</button>}
    <Link to="/arcade">Back to Arcade</Link>
  </section>;
}
