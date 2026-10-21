// Local synthetic fixture only, excluded from the production entry.
import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Context} from '../features/interview/InterviewState';
import {PracticeExtras} from '../features/interview/PracticeExtras';
import {interviewRequest,streamFeedback} from '../features/interview/api';
function App(){const [fixture,setFixture]=useState<any>(null),[text,setText]=useState('');
 useEffect(()=>{fetch('/api/interview/test-setup').then(r=>r.json()).then(row=>{setFixture(row);setText(row.answer.answer);});},[]);
 return <main style={{maxWidth:700,padding:24,fontFamily:'system-ui'}}><h1>Optional practice validation</h1><p>Disposable session, synthetic answer, local AI model. No real account data.</p>{fixture&&<Context.Provider value={{request:(path,method,body)=>interviewRequest(path,{method,body,csrf:fixture.csrf}),feedback:(path,revision,signal,onText)=>streamFeedback(path,revision,fixture.csrf,signal,onText)}}><h2>{fixture.question.questionText}</h2><label>Draft answer<textarea style={{width:'100%'}} rows={5} value={text} onChange={e=>setText(e.target.value)}/></label><PracticeExtras sessionId={fixture.id} question={fixture.question} answer={fixture.answer} dirty={text!==fixture.answer.answer} disabled={false} text={text} onText={setText}/></Context.Provider>}</main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
