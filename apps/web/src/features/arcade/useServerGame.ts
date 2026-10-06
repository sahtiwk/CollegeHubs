import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { arcadeRequest, ArcadeError, type Game, type GameProps } from './api';
type Request = {path:string;body:unknown};
export function useServerGame(gameId:string,{session,onExpired}:GameProps) {
  const {id}=useParams(),navigate=useNavigate();
  const [game,setGame]=useState<Game|null>(null),[busy,setBusy]=useState(!!id),[error,setError]=useState(''),[pending,setPending]=useState<Request|null>(null),[revision,setRevision]=useState(0);
  const creationId=useRef(crypto.randomUUID()),generation=useRef(0),flight=useRef(false),controller=useRef<AbortController|null>(null);
  function checked(value:Game) { if(value.gameId!==gameId)throw new ArcadeError('This saved round belongs to another game.',404);return value; }
  useEffect(()=>{
    const version=++generation.current,abort=new AbortController();controller.current=abort;flight.current=false;setGame(null);setError('');setPending(null);setBusy(!!id);
    if(id)arcadeRequest('/sessions/'+id,{signal:abort.signal}).then(data=>{if(generation.current===version)setGame(checked(data.game));}).catch(err=>{if(!abort.signal.aborted){if(err instanceof ArcadeError&&err.status===401)onExpired();else setError(err.message||'Your saved round is unavailable.');}}).finally(()=>{if(generation.current===version)setBusy(false);});
    return()=>{generation.current++;abort.abort();};
  },[id,gameId,session.userId,session.hubId,session.csrfToken,revision]);
  async function send(request:Request) {
    if(flight.current)return;flight.current=true;const version=generation.current;
    setBusy(true);setError('');setPending(request);
    try {
      const data=await arcadeRequest(request.path,{method:'POST',body:request.body,csrf:session.csrfToken,signal:controller.current?.signal});
      if(version!==generation.current)return;
      const value=checked(data.game);setPending(null);
      if(request.path==='/sessions'){creationId.current=crypto.randomUUID();navigate('/arcade/'+gameId+'/'+value.id);}else setGame(value);
    } catch(err) {
      if(version!==generation.current)return;
      if(err instanceof ArcadeError&&err.status===401){onExpired();return;}
      if(err instanceof ArcadeError&&err.status<500){setPending(null);setError(err.message+(err.status===409?' Reload your saved round to continue.':''));}
      else setError('Save unconfirmed. Retry the same request or reload your saved round.');
    } finally {if(version===generation.current){flight.current=false;setBusy(false);}}
  }
  return {game,busy,error,pending,hasSavedGame:!!id,reload:()=>setRevision(n=>n+1),retry:()=>pending&&send(pending),
    start:()=>send({path:'/sessions',body:{gameId,clientSessionId:creationId.current}}),
    action:(input:object)=>game&&send({path:'/sessions/'+game.id+'/actions',body:{seq:game.actions.length+1,...input}}),
    complete:()=>game&&send({path:'/sessions/'+game.id+'/complete',body:{}})};
}
