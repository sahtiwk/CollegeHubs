import React,{useEffect,useState}from'react';
import{useAuth}from'../../auth/AuthProvider';
import{ensureArcadeSession,clearArcadeSession,type ArcadeSession}from'./api';
import NumberGuess from './games/NumberGuess';
export default function Arcade(){const{user}=useAuth();const[session,setSession]=useState<ArcadeSession|null>(null),[error,setError]=useState(''),[progress,setProgress]=useState('Opening Arcade…'),[attempt,setAttempt]=useState(0);
useEffect(()=>{let active=true;setSession(null);setError('');ensureArcadeSession(user,text=>{if(active)setProgress(text);}).then(dto=>{if(active)setSession(dto);}).catch(err=>{if(active)setError(err.message||'Arcade is unavailable.');});return()=>{active=false;};},[user._id,user.hubId,user.membershipVersion,attempt]);
const expired=()=>{clearArcadeSession();setSession(null);setError('Your Arcade session expired. Reconnect to recover your saved game.');};
return session?<NumberGuess session={session} onExpired={expired}/>:<section className="card stack"><h1>Arcade</h1>{error?<><p className="error" role="alert">{error}</p><button onClick={()=>{clearArcadeSession();setAttempt(n=>n+1);}}>Reconnect Arcade</button></>:<p role="status">{progress}</p>}</section>;}
