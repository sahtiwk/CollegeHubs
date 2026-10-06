import api from '../../api';
import { createSessionCoordinator } from '../../auth/moduleSessionState';
import { sanitizeTheme } from '../learn/hubTheme';
type Options = { method?: string; body?: unknown; signal?: AbortSignal; timeout?: number; csrf?: string };
export type ArcadeSession = { userId: string; hubId: string; membershipVersion: number; expiresAt: string; csrfToken: string; theme: any };
export type CoreUser = { _id: string; hubId: string; membershipVersion: number };
export type GameAction = {seq: number; guess?: number; hint: string; status: string; type?: string; questionId?: string; answer?: number; correct?: boolean; left?: number; right?: number; choice?: string};
export type Game = { id: string; gameId: string; rulesVersion: string; status: string; createdAt: string; expiresAt: string; serverNow: string; actions: GameAction[]; deliveryStatus: string; receipt: null | {awardedAura: number; reason: string; dayKey: string}; math?: {correctCount: number; questionIndex: number; currentQuestion: null|{id:string;num1:number;num2:number;operation:string};canFinish:boolean;deadlinePassed:boolean};sorting?: {array:number[];pass:number;index:number;needsSwap:boolean;comparisons:number;swaps:number;traceComplete:boolean} };
export type GameProps = {session:ArcadeSession;onExpired:()=>void};
export class ArcadeError extends Error { status: number; code: string; constructor(message: string, status = 503, code = 'ARCADE_UNAVAILABLE') { super(message); this.status = status; this.code = code; } }
const coordinator = createSessionCoordinator(() => localStorage.getItem('socialstream_token'));
export async function arcadeRequest(path: string, {method='GET',body,signal,timeout=15000,csrf}: Options = {}) {
  if (!['/session','/auth/start','/auth/callback','/logout','/health/ready','/games','/sessions','/me/activity'].includes(path) && !/^\/sessions\/[a-f0-9]{24}(?:\/(?:actions|complete))?$/.test(path)) throw new ArcadeError('Unknown Arcade route',400);
  const response = await fetch('/api/arcade'+path,{method,credentials:'same-origin',redirect:'error',cache:'no-store',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(timeout)]):AbortSignal.timeout(timeout),headers:{...(body?{'Content-Type':'application/json'}:{}),...(csrf?{'X-CSRF-Token':csrf}:{})},...(body?{body:JSON.stringify(body)}:{})});
  if (!response.headers.get('content-type')?.includes('application/json')) throw new ArcadeError('Arcade returned an unexpected response.');
  const data = await response.json(); if(!response.ok)throw new ArcadeError(data.error?.message || 'Arcade is unavailable. Retry shortly.',response.status,data.error?.code);return data;
}
function checked(dto: ArcadeSession,user: CoreUser) {if(dto.userId!==user._id||dto.hubId!==user.hubId||dto.membershipVersion!==user.membershipVersion||Date.parse(dto.expiresAt)<=Date.now()+1000)throw new ArcadeError('Reconnect your Arcade session.',401);sanitizeTheme(dto.theme,dto.hubId,dto.theme.themeVersion);return dto;}
export function clearArcadeSession(remote=false){const old=coordinator.clear();if(remote&&old?.csrfToken)fetch('/api/arcade/logout',{method:'POST',credentials:'same-origin',redirect:'error',keepalive:true,headers:{'X-CSRF-Token':old.csrfToken}}).catch(()=>{});}
window.addEventListener('core-session',()=>clearArcadeSession(true));window.addEventListener('storage',event=>{if(!event.key||event.key==='socialstream_token')clearArcadeSession(true);});
export function ensureArcadeSession(user: CoreUser,progress: (text:string)=>void=()=>{}): Promise<ArcadeSession> {return coordinator.run([user._id,user.hubId,user.membershipVersion].join(':'),async(signal:AbortSignal,current:()=>void)=>{
  progress('Opening Arcade. Free hosting may take about a minute.');await arcadeRequest('/health/ready',{signal,timeout:75000});current();
  try{const dto=checked(await arcadeRequest('/session',{signal}),user);current();return dto;}catch(error){if(!(error instanceof ArcadeError)||error.status!==401)throw error;}
  progress('Connecting your college session…');const {state}=await arcadeRequest('/auth/start',{method:'POST',signal});current();
  const {data}=await api.post('/auth/module-grants',{module:'arcade',state,returnPath:'/arcade'},{signal});current();
  if(data.callbackPath!=='/api/arcade/auth/callback')throw new ArcadeError('Invalid Arcade callback');
  await arcadeRequest('/auth/callback',{method:'POST',signal,body:{module:'arcade',state,grant:data.grant}});current();
  const dto=checked(await arcadeRequest('/session',{signal}),user);current();return dto;
});}
