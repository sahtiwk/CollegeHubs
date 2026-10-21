import React,{useContext,useEffect,useRef,useState} from 'react';
import {Context,type Question,type Answer,message} from './InterviewState';

export function PracticeExtras({sessionId,question,answer,dirty,disabled,text,onText}:{sessionId:string;question:Question;answer:Answer;dirty:boolean;disabled:boolean;text:string;onText:(value:string)=>void}) {
  const {request,feedback}=useContext(Context),[available,setAvailable]=useState(false),[output,setOutput]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
  const run=useRef<AbortController|null>(null);
  useEffect(()=>{let live=true;request('/capabilities').then(c=>{if(live)setAvailable(c.streaming===true);}).catch(()=>{});return()=>{live=false;};},[]);
  useEffect(()=>{run.current?.abort();setOutput('');setStatus('');setBusy(false);return()=>run.current?.abort();},[sessionId,question.id,answer.revision,dirty,disabled]);
  async function start(){run.current?.abort();const controller=new AbortController();run.current=controller;setOutput('');setBusy(true);setStatus('Receiving practice feedback…');
    try{await feedback('/sessions/'+sessionId+'/answers/'+question.id+'/feedback',answer.revision,controller.signal,chunk=>{if(!controller.signal.aborted)setOutput(value=>value+chunk);});if(!controller.signal.aborted)setStatus('Feedback complete. This is not a saved report or score.');}
    catch(e){if(!controller.signal.aborted){setOutput('');setStatus('Feedback interrupted. '+message(e));}}
    finally{if(run.current===controller)setBusy(false);}
  }
  return <section className="stack" aria-label="Optional practice tools"><VoiceTools question={question.questionText} text={text} onText={onText} disabled={disabled} identity={sessionId+question.id}/>{available&&<><p className="muted">Optional feedback uses your saved answer and this question with the session’s AI provider. It is temporary, ungraded, and earns no Aura.</p><div className="interview-actions"><button disabled={disabled||dirty||!answer.revision||answer.skipped||busy} onClick={start}>Get live feedback</button>{busy&&<button onClick={()=>{run.current?.abort();setBusy(false);setOutput('');setStatus('Feedback cancelled. Your saved answer is unchanged.');}}>Cancel feedback</button>}</div>{status&&<p role="status">{status}</p>}{output&&<p style={{whiteSpace:'pre-wrap'}}>{output}</p>}</>}</section>;
}

function VoiceTools({question,text,onText,disabled,identity}:{question:string;text:string;onText:(value:string)=>void;disabled:boolean;identity:string}) {
  const [voices,setVoices]=useState<SpeechSynthesisVoice[]>([]),[notice,setNotice]=useState(''),[listening,setListening]=useState(false),[downloadable,setDownloadable]=useState(false),[installing,setInstalling]=useState(false);
  const recognition=useRef<any>(null),generation=useRef(0),base=useRef('');
  const Speech=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
  const localRecognition=!!Speech&&'processLocally' in Speech.prototype&&typeof Speech.available==='function';
  const stop=()=>{generation.current++;recognition.current?.abort();recognition.current=null;window.speechSynthesis?.cancel();setListening(false);};
  useEffect(()=>{const update=()=>setVoices(window.speechSynthesis?.getVoices().filter(v=>v.localService&&v.lang.startsWith('en'))||[]);update();window.speechSynthesis?.addEventListener('voiceschanged',update);return()=>window.speechSynthesis?.removeEventListener('voiceschanged',update);},[]);
  useEffect(()=>{stop();setNotice('');return stop;},[identity,disabled]);
  useEffect(()=>{if(listening&&text!==base.current)stop();},[text]);
  useEffect(()=>{if(!listening)return;const timer=setTimeout(()=>{stop();setNotice('Dictation stopped after one minute. Review your draft.');},60000);return()=>clearTimeout(timer);},[listening]);
  useEffect(()=>{const hidden=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hidden);return()=>document.removeEventListener('visibilitychange',hidden);},[]);
  async function dictate(){stop();const token=generation.current;setNotice('Checking on-device English speech…');
    try{const ready=await Speech.available({langs:['en-US'],processLocally:true});if(token!==generation.current)return;if(ready!=='available'){setDownloadable(['downloadable','downloading'].includes(ready)&&typeof Speech.install==='function');setNotice(ready==='unavailable'?'This browser cannot download on-device English speech. Type your answer instead.':'On-device English speech is not installed. Download the speech pack or type your answer.');return;}
      const r=new Speech();recognition.current=r;r.processLocally=true;r.lang='en-US';r.continuous=false;r.interimResults=false;base.current=text;
      r.onresult=(event:any)=>{if(token!==generation.current)return;const transcript=Array.from(event.results as any).filter((v:any)=>v.isFinal).map((v:any)=>v[0].transcript).join(' ');onText((base.current+' '+transcript).trim().slice(0,2000));setNotice('Dictation added to your draft. Review it, then save.');};
      r.onerror=(event:any)=>{if(token===generation.current){setListening(false);const notices:Record<string,string>={'not-allowed':'Microphone access was denied. Allow it in browser settings or type your answer.','audio-capture':'Dictation could not access the microphone. Check browser and system microphone access, or type your answer.','no-speech':'No speech was detected. Try again or type your answer.','language-not-supported':'On-device English speech is unavailable. Try reinstalling the speech pack or type your answer.'};setNotice(notices[event.error]||'On-device dictation could not start. You can still type.');}};
      r.onend=()=>{if(token===generation.current)setListening(false);};r.start();setListening(true);setNotice('Listening on this device. Stop when finished.');
    }catch{setNotice('On-device dictation is unavailable. You can still type.');}
  }
  async function install(){setInstalling(true);setNotice('Downloading on-device English speech. No microphone audio is sent.');try{const ok=await Speech.install({langs:['en-US'],processLocally:true});setDownloadable(!ok);setNotice(ok?'Speech pack ready. Choose Dictate answer on device.':'Speech pack download failed. You can still type.');}catch{setNotice('Speech pack download is unavailable in this browser.');}finally{setInstalling(false);}}
  return <><p className="muted">Voice is optional. Only on-device voices and dictation are used; availability depends on your browser. Dictation edits your draft and does not save it.</p><div className="interview-actions"><button disabled={disabled||!voices.length} onClick={()=>{stop();const speech=new SpeechSynthesisUtterance(question);speech.voice=voices[0];const token=generation.current;speech.onstart=()=>{if(token===generation.current)setNotice('Reading the question on this device.');};speech.onend=()=>{if(token===generation.current)setNotice('Question readout finished.');};speech.onerror=()=>{if(token===generation.current)setNotice('Question readout unavailable. Read the question above.');};window.speechSynthesis.speak(speech);}}>Read question aloud</button>{localRecognition&&<button disabled={disabled||listening} onClick={dictate}>Dictate answer on device</button>}{downloadable&&<button disabled={installing||disabled} onClick={install}>{installing?'Downloading speech pack...':'Download English speech pack'}</button>}<button onClick={()=>{stop();setNotice('Voice stopped.');}}>Stop voice</button></div>{notice&&<p role="status">{notice}</p>}</>;
}
