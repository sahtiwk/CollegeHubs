const test=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {feedbackStream}=require('../../packages/contracts/feedback-stream.cjs');
const env={INTERVIEW_AI_PROVIDER:'local',LOCAL_INFERENCE_ENABLED:'true',INTERVIEW_STREAMING_ENABLED:'true'};
const event=(text,finish=null)=>'data: '+JSON.stringify({choices:[{index:0,delta:{content:text},finish_reason:finish}]})+'\n\n';
const sse=text=>new Response(text,{headers:{'content-type':'text/event-stream'}});
test('feedback streams only bounded content and rejects truncation, tools, disabled access and cancellation',async()=>{
 let sent='',request;const adapter=feedbackStream({env,fetcher:async(url,options)=>{request=JSON.parse(options.body);return sse(event('A strength. ')+event('An improvement.','stop')+'data: [DONE]\n\n');}});
 await adapter.stream({question:'Explain tests',answer:'Use an edge case'},{signal:new AbortController().signal,onText:t=>{sent+=t;}});
 assert.equal(sent,'A strength. An improvement.');assert.equal(request.stream,true);assert.equal(request.model,'Qwen/Qwen2.5-1.5B-Instruct');
 for(const value of [event('partial'),event('x','length')+'data: [DONE]\n\n',event('x'.repeat(4001),'stop')+'data: [DONE]\n\n','data: {bad}\n', 'data: '+JSON.stringify({choices:[{index:0,delta:{tool_calls:[{}]}}]})+'\n']){
   await assert.rejects(feedbackStream({env,fetcher:async()=>sse(value)}).stream({},{signal:new AbortController().signal,onText(){}}),{code:'AI_INVALID_RESPONSE'});
 }
 await assert.rejects(feedbackStream({env:{...env,INTERVIEW_STREAMING_ENABLED:'false'}}).stream({},{signal:new AbortController().signal,onText(){}}),{code:'AI_UNAVAILABLE'});
 const abort=new AbortController();abort.abort();await assert.rejects(feedbackStream({env,fetcher:async()=>{abort.signal.throwIfAborted();}}).stream({},{signal:abort.signal,onText(){}}),{code:'AI_CANCELLED'});
});
test('feedback rechecks saved revisions and authorization, serializes provider use and never writes rewards',{skip:!process.env.GUARD_MONGO_URI},async()=>{
 const mongoose=require('mongoose');mongoose.set('autoCreate',false).set('autoIndex',false);
 const connection=await mongoose.createConnection(process.env.GUARD_MONGO_URI,{dbName:'collegehubs_demo_feedback_'+randomUUID().replaceAll('-','')}).asPromise();
 try{
  const models=Object.fromEntries(['Interview','Resume','Session','AiControl'].map(n=>[n,require('../../services/interview/src/models/'+n+(n==='AiControl'?'':'.model'))(connection)]));
  for(const m of Object.values(models)){await m.createCollection();await m.createIndexes();}
  const scope={userId:'a'.repeat(24),hubId:'b'.repeat(24)},identity={user_id:scope.userId,hub_id:scope.hubId,principal:{exp:Math.floor(Date.now()/1000)+3600}};
  const questionId=randomUUID(),row=await models.Session.create({...scope,interviewId:new mongoose.Types.ObjectId(),questions:[{id:questionId,questionText:'Explain a test',category:'technical',difficulty:'easy',expectedKeywords:['test']}],answers:[{questionId,answer:'Test an edge case',revision:1}]});
  let during=async()=>{},calls=0;const ai={provider:'groq',model:'openai/gpt-oss-20b',streaming:true,feedback:async(context,{onText})=>{calls++;assert.deepEqual(context,{question:'Explain a test',answer:'Test an edge case'});await onText('first');await during();await onText('second');}};
  const service=require('../../services/interview/src/services/practiceService').createPracticeService(connection,models,ai,{trigger(){throw Error('No reward allowed');}});
  const input={revision:1,requestId:randomUUID()},options={signal:new AbortController().signal,reauthorize:async()=>{},onText:()=>{}};
  await assert.rejects(service.feedback({...identity,hub_id:'c'.repeat(24)},row.id,questionId,input,options),{code:'NOT_FOUND'});assert.equal(calls,0);
  await assert.rejects(service.feedback(identity,row.id,questionId,{...input,revision:2},options),{code:'ANSWER_REVISION_CONFLICT'});
  let chunks=[];await service.feedback(identity,row.id,questionId,input,{...options,onText:t=>chunks.push(t)});assert.deepEqual(chunks,['first','second']);
  during=async()=>{await assert.rejects(service.feedback(identity,row.id,questionId,input,options),{code:'AI_BUSY'});await models.Session.updateOne({_id:row._id},{$set:{'answers.0.revision':2}});};chunks=[];
  await assert.rejects(service.feedback(identity,row.id,questionId,input,{...options,onText:t=>chunks.push(t)}),{code:'ANSWER_REVISION_CONFLICT'});assert.deepEqual(chunks,['first']);
  const retained=await models.Session.findById(row.id);assert.equal(retained.report,null);assert.equal(retained.event,null);assert.equal(retained.status,'active');assert.equal((await models.AiControl.findById('provider')).leaseToken,null);
  await models.Session.updateOne({_id:row._id},{$set:{'answers.0.revision':1}});during=async()=>{};let checks=0;
  await assert.rejects(service.feedback(identity,row.id,questionId,input,{...options,reauthorize:async()=>{if(++checks>1)throw Object.assign(Error(),{status:401,code:'INTERVIEW_SESSION_REQUIRED'});}}),{code:'INTERVIEW_SESSION_REQUIRED'});
 }finally{await connection.dropDatabase();await connection.close();}
});
test('gateway permits stream MIME only on the exact feedback route',async()=>{
 const {proxyApi}=await import('../../apps/web/functions/api/[[path]].ts'),origin={INTERVIEW_API_ORIGIN:'https://interview.example'};
 const route='/api/interview/sessions/'+'a'.repeat(24)+'/answers/'+randomUUID()+'/feedback';
 const upstream=async()=>new Response('{"type":"done"}\n',{headers:{'content-type':'application/x-ndjson'}});
 assert.equal((await proxyApi(new Request('https://app.example'+route,{method:'POST',body:'{}'}),origin,upstream)).status,200);
 assert.equal((await proxyApi(new Request('https://app.example/api/interview/sessions'),origin,upstream)).status,502);
 assert.equal((await proxyApi(new Request('https://app.example'+route),origin,upstream)).status,502);
});
