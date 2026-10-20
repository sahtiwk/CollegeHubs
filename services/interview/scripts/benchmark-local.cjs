// Explicit local-only synthetic feasibility probe. Never reads resumes, env files or credentials.
const {createInference}=require('@collegehubs/contracts/inference.cjs');
const {validateQuestions}=require('../src/services/evaluationPolicy');
async function main(){
 const p=createInference({env:{INTERVIEW_AI_PROVIDER:'local',LOCAL_INFERENCE_ENABLED:'true',LOCAL_INFERENCE_URL:process.env.LOCAL_INFERENCE_URL,LOCAL_INFERENCE_MODEL:'Qwen/Qwen2.5-1.5B-Instruct'},timeoutMs:20000});
 const ai=require('../src/services/ai.service').createAiService({env:{INTERVIEW_AI_PROVIDER:'local',LOCAL_INFERENCE_ENABLED:'true',LOCAL_INFERENCE_URL:process.env.LOCAL_INFERENCE_URL},timeoutMs:20000});
 const reports=[];
 for(const size of [500,8000]){
  const start=performance.now(),rss=process.memoryUsage().rss;
  try{const output=await ai.generate({resumeText:'Synthetic developer built an array-based inventory and tests. '.repeat(150).slice(0,size),jobTitle:'Engineering intern',jobDescription:'Explain implementation, testing and tradeoffs. '.repeat(100).slice(0,5000),categoryOrder:Array(5).fill('technical'),experienceLevel:'entry',learnTopics:[]});validateQuestions(output,['technical']);reports.push({resumeCharacters:size,valid:true,latencyMs:Math.round(performance.now()-start),clientRssDelta:process.memoryUsage().rss-rss});}
  catch(e){reports.push({resumeCharacters:size,valid:false,error:e.code,latencyMs:Math.round(performance.now()-start)});}
 }
 // Non-grading comprehension probe with maximum saved answer lengths.
 const start=performance.now();
 try{
  const output=await p.request('synthetic_answer_probe','Summarize these synthetic answers for a test. Do not assign scores or rewards.',{answers:Array.from({length:5},(_,i)=>({questionId:String(i),answer:'Synthetic answer: explain a concrete example and test a tradeoff. '.repeat(40).slice(0,2000)}))},{type:'object',additionalProperties:false,required:['summary'],properties:{summary:{type:'string',maxLength:1500}}});
  const valid=typeof output?.summary==='string'&&output.summary.length<=1500&&Object.keys(output).length===1;
  reports.push({answerCharacters:10000,valid,latencyMs:Math.round(performance.now()-start)});
 }catch(e){reports.push({answerCharacters:10000,valid:false,error:e.code,latencyMs:Math.round(performance.now()-start)});}
 console.log(JSON.stringify({model:p.model,provider:p.provider,rewardable:false,qualityGate:'not-approved',measurements:reports,note:'Client memory is not inference-server or GPU memory. No grading quality or hosted availability is certified.'},null,2));
}
main().catch(()=>{console.error('Local synthetic probe failed');process.exitCode=1;});
