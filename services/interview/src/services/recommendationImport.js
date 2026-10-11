const {randomUUID}=require('node:crypto');
const {jsonRequest}=require('./http');
const {validateTopics}=require('@collegehubs/contracts/learn-topics.cjs');
const {fail}=require('../errors');
module.exports=(Interview,config,fetcher=fetch)=>async(identity,id,body)=>{
  if(!/^[a-f0-9]{24}$/.test(id||'')||!body||Object.keys(body).join(',')!=='recommendationRef'||typeof body.recommendationRef!=='string'||!/^[a-zA-Z0-9_-]{43}$/.test(body.recommendationRef))throw fail(400,'INVALID_RECOMMENDATION');
  const owner={userId:identity.user_id,hubId:identity.hub_id},lease=randomUUID(),now=new Date();
  const row=await Interview.findOneAndUpdate({...owner,_id:id,status:{$in:['draft','generation_failed']},'questions.0':{$exists:false},$or:[{topicLeaseUntil:{$exists:false}},{topicLeaseUntil:{$lte:now}}]},{$set:{topicLease:lease,topicLeaseUntil:new Date(+now+10000)}},{new:true});
  if(!row)throw fail(409,'TOPICS_LOCKED','Topics can only be imported into an unused, idle interview setup.');
  try{
    const response=await jsonRequest(config.core+'/api/auth/interview-recommendations/consume',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+config.serviceKey},body:JSON.stringify({recommendationRef:body.recommendationRef,userId:identity.user_id,hubId:identity.hub_id,membershipVersion:identity.principal.membershipVersion,accessJti:identity.principal.jti})},fetcher);
    if(!response.ok)throw fail(response.status===503?503:409,'RECOMMENDATION_INVALID','Select topics again; the recommendation expired, changed or was already used.');
    const topics=validateTopics(response.data.topics);if(!topics.length)throw Error('Empty recommendation');
    const saved=await Interview.findOneAndUpdate({...owner,_id:id,topicLease:lease,topicLeaseUntil:{$gt:new Date()},status:{$in:['draft','generation_failed']},'questions.0':{$exists:false}},{$set:{learnTopics:topics,topicLease:null,topicLeaseUntil:new Date(0)}},{new:true});
    if(!saved)throw fail(409,'TOPICS_LOCKED','Import could not finish. Select topics again.');
    return {topics:saved.learnTopics.map(t=>({nodeId:t.nodeId,label:t.label,version:t.version,reason:t.reason,asOf:t.asOf}))};
  }catch(error){if(error.status)throw error;throw fail(503,'SUGGESTIONS_UNAVAILABLE','Import could not finish. Select topics again or continue without them.');}
  finally{await Interview.updateOne({...owner,_id:id,topicLease:lease},{$set:{topicLease:null,topicLeaseUntil:new Date(0)}});}
};
