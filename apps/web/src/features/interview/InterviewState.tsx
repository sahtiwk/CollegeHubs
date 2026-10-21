import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { clearInterviewSession, ensureInterviewSession, interviewRequest, streamFeedback, InterviewError, type InterviewSession } from './api';
export type Question = { id: string; questionText: string; category: string; difficulty: string };
export type Answer = { questionId: string; answer: string; skipped: boolean; revision: number };
export type Practice = { practiceMode?:boolean;providerId?:string;providerModel?:string; id: string; jobTitle: string; status: string; questions: Question[]; answers: Answer[]; elapsedSeconds: number; createdAt: string; retryAt: string; leaseUntil: string; lastError?: string; deliveryStatus: string; receipt?: { awardedAura: number; reason: string }; report?: { ungraded?:boolean;providerId?:string;providerModel?:string; score: number; summary: string; answeredCount: number; answers: {questionId:string;score:number;feedback:string}[] } };
export const errors: Record<string,string> = { AI_PROVIDER_CHANGED:'This session is bound to its original provider. Restore that provider to evaluate; your saved answers are safe.', AI_GRADING_UNSUPPORTED:'This provider is not approved for grading. Use ungraded practice.', AI_UNAVAILABLE: 'AI is unavailable. Your saved work is safe; try again later.', AI_RATE_LIMIT: 'The provider reached its limit. Wait before retrying.', AI_QUOTA: 'The practice allowance is reached. Try again later.', AI_BUSY: 'Another interview is using AI. Please retry shortly.', AI_COOLDOWN: 'Please wait until the retry time shown below.', AI_TIMEOUT: 'AI took too long. Your saved work is safe; retry shortly.', AI_INVALID_RESPONSE: 'AI returned an invalid response. No report was completed; retry shortly.', ANSWER_REVISION_CONFLICT: 'This answer changed in another tab. Refresh saved answers before editing.', ANSWERS_LOCKED: 'Answers are locked while evaluating or after completion.', RESUME_UNAVAILABLE: 'This resume was deleted or expired. Create a new interview with a saved resume.', ANSWERS_NOT_SAVED: 'Save or explicitly skip all five answers first.', DRAFT_LIMIT: 'You have 20 unfinished interviews. Delete an unused draft from history before creating another.' };
export const message = (e: unknown) => e instanceof InterviewError ? errors[e.code] || e.message : 'The request could not finish. Refresh saved work before retrying.';
type Access = { feedback:(path:string,revision:number,signal:AbortSignal,onText:(text:string)=>void)=>Promise<void>; request: (path:string, method?:string, body?:unknown)=>Promise<any> };
export const Context = createContext<Access>(null!);
export function PracticeAccess({children}:{children:React.ReactNode}) {
  const {user}=useAuth(); const [ready,setReady]=useState(false),[error,setError]=useState(''),[progress,setProgress]=useState('Opening Interview…'),[attempt,setAttempt]=useState(0);
  const session=useRef<InterviewSession|null>(null), lifetime=useRef<AbortController|null>(null);
  useEffect(()=>{const controller=new AbortController();lifetime.current=controller;setReady(false);setError('');ensureInterviewSession(user,text=>{if(!controller.signal.aborted)setProgress(text);}).then(dto=>{if(!controller.signal.aborted){session.current=dto;setReady(true);}}).catch(e=>{if(!controller.signal.aborted)setError(message(e));});return()=>controller.abort();},[user._id,user.hubId,user.membershipVersion,attempt]);
  async function request(path:string,method='GET',body?:unknown) {
    const signal=lifetime.current!.signal;
    // Renew before long operations so the completion occurrence uses a live grant.
    if (!session.current || Date.parse(session.current.expiresAt)<Date.now()+35000) { clearInterviewSession(); session.current=await ensureInterviewSession(user,()=>{}); }
    try{return await interviewRequest(path,{method,body,csrf:session.current.csrfToken,signal});}
    catch(e){if(e instanceof InterviewError&&e.status===401){clearInterviewSession();session.current=null;}throw e;}
  }
  async function feedback(path:string,revision:number,signal:AbortSignal,onText:(text:string)=>void){
    if(!session.current||Date.parse(session.current.expiresAt)<Date.now()+35000){clearInterviewSession();session.current=await ensureInterviewSession(user,()=>{});}
    return streamFeedback(path,revision,session.current.csrfToken,AbortSignal.any([signal,lifetime.current!.signal]),onText);
  }
  if(!ready)return <section className="card stack">{error?<><p role="alert">{error}</p><button onClick={()=>{clearInterviewSession();setAttempt(n=>n+1);}}>Reconnect Interview</button></>:<p role="status">{progress}</p>}</section>;
  return <Context.Provider value={{request,feedback}}>{children}</Context.Provider>;
}
export function useLoad(path:string){const {request}=useContext(Context),[data,setData]=useState<any>(null),[error,setError]=useState(''),[reload,setReload]=useState(0);useEffect(()=>{let active=true;setError('');request(path).then(value=>{if(active)setData(value);}).catch(e=>{if(active)setError(message(e));});return()=>{active=false;};},[path,reload]);return {data,setData,error,setError,refresh:()=>setReload(v=>v+1),request};}
export function LoadError({error,refresh}:{error:string;refresh:()=>void}){return error?<div className="card stack"><p role="alert" className="error">{error}</p><button onClick={refresh}>Refresh saved work</button></div>:null;}
