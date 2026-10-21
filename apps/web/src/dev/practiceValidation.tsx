// Local synthetic fixture only, excluded from the production entry.
import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Context} from '../features/interview/InterviewState';
import {PracticeExtras} from '../features/interview/PracticeExtras';
import {interviewRequest,streamFeedback} from '../features/interview/api';
function App(){const [fixture,setFixture]=useState<any>(null),[text,setText]=useState(''),[microphone,setMicrophone]=useState('');
 async function checkMicrophone(){const observations:any[]=[];try{const devices=await navigator.mediaDevices.enumerateDevices(),inputs=devices.filter(d=>d.kind==='audioinput');observations.push({inputs:inputs.map(d=>({label:d.label,default:d.deviceId==='default'}))});for(const input of [null,...inputs.filter(d=>!['default','communications'].includes(d.deviceId))]){let stream:MediaStream|undefined;try{stream=await navigator.mediaDevices.getUserMedia({audio:input?{deviceId:{exact:input.deviceId},echoCancellation:false,noiseSuppression:false,autoGainControl:false}:true});observations.push({device:input?.label||'default',capture:'opened',tracks:stream.getAudioTracks().map(t=>({label:t.label,state:t.readyState,muted:t.muted}))});}catch(e:any){observations.push({device:input?.label||'default',capture:'failed',name:e.name,message:e.message});}finally{stream?.getTracks().forEach(t=>t.stop());}setMicrophone(JSON.stringify(observations));}}catch(e:any){setMicrophone(JSON.stringify({name:e.name,message:e.message}));}}

 useEffect(()=>{fetch('/api/interview/test-setup').then(r=>r.json()).then(row=>{setFixture(row);setText(row.answer.answer);});},[]);
 return <main style={{maxWidth:700,padding:24,fontFamily:'system-ui'}}><h1>Optional practice validation</h1><button onClick={checkMicrophone}>Check microphone access</button><p role="status">{microphone}</p><p>Disposable session, synthetic answer, local AI model. No real account data.</p>{fixture&&<Context.Provider value={{request:(path,method,body)=>interviewRequest(path,{method,body,csrf:fixture.csrf}),feedback:(path,revision,signal,onText)=>streamFeedback(path,revision,fixture.csrf,signal,onText)}}><h2>{fixture.question.questionText}</h2><label>Draft answer<textarea style={{width:'100%'}} rows={5} value={text} onChange={e=>setText(e.target.value)}/></label><PracticeExtras sessionId={fixture.id} question={fixture.question} answer={fixture.answer} dirty={text!==fixture.answer.answer} disabled={false} text={text} onText={setText}/></Context.Provider>}</main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
