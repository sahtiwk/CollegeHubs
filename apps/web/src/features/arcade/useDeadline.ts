import {useEffect,useState} from 'react';
import {type Game} from './api';
// Display only: the service enforces the immutable deadline and qualification.
export function useDeadline(game:Game|null) {
  const [clock,setClock]=useState({server:Date.now(),local:Date.now(),tick:Date.now()});
  useEffect(()=>{
    const local=Date.now(),server=game?Date.parse(game.serverNow):local;
    setClock({local,server,tick:local});
    if(!game||!['active','awaiting_completion'].includes(game.status))return;
    const interval=setInterval(()=>setClock(value=>({...value,tick:Date.now()})),500);
    return()=>clearInterval(interval);
  },[game?.id,game?.serverNow,game?.status]);
  const now=clock.server+clock.tick-clock.local;
  return {remaining:game?Math.max(0,Math.ceil((Date.parse(game.expiresAt)-now)/1000)):0,elapsed:game?Math.max(0,(now-Date.parse(game.createdAt))/1000):0};
}
