import React,{useEffect,useState,Suspense}from'react';
import {Link,useParams} from 'react-router-dom';
import{useAuth}from'../../auth/AuthProvider';
import{ensureArcadeSession,clearArcadeSession,type ArcadeSession}from'./api';
import Catalogue from './Catalogue';
import DailyChallenge from './DailyChallenge';
import {gameRoute,gameComponent} from './gameRegistry';
export default function Arcade(){const{gameId,id}=useParams();const{user}=useAuth();const[session,setSession]=useState<ArcadeSession|null>(null),[error,setError]=useState(''),[progress,setProgress]=useState('Opening Arcade…'),[attempt,setAttempt]=useState(0);
useEffect(()=>{let active=true;setSession(null);setError('');ensureArcadeSession(user,text=>{if(active)setProgress(text);}).then(dto=>{if(active)setSession(dto);}).catch(err=>{if(active)setError(err.message||'Arcade is unavailable.');});return()=>{active=false;};},[user._id,user.hubId,user.membershipVersion,attempt]);
const expired=()=>{clearArcadeSession();setSession(null);setError('Your Arcade session expired. Reconnect to recover your saved game.');};
const entry=gameId?gameRoute(gameId):null,Component=entry?.status==='ranked'?gameComponent(gameId):null;
return session?<Suspense fallback={<p role="status">Opening your game...</p>}>{!gameId?<Catalogue session={session} onExpired={expired}/>:gameId==='daily'?<DailyChallenge key={id||'today'} session={session} onExpired={expired}/>:Component?<Component key={gameId+':'+(id||'new')} session={session} onExpired={expired}/>:<section className="card stack"><h1>Game unavailable</h1><p>This game has not been released.</p><Link to="/arcade">Back to Arcade</Link></section>}</Suspense>:<section className="card stack"><h1>Arcade</h1>{error?<><p className="error" role="alert">{error}</p><button onClick={()=>{clearArcadeSession();setAttempt(n=>n+1);}}>Reconnect Arcade</button></>:<p role="status">{progress}</p>}</section>;}
