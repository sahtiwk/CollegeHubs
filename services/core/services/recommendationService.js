const ModuleGrant=require('../models/ModuleGrant');
const {requireHubAccess}=require('./hubAccess');
const {digest,opaque,failure}=require('./moduleTokenService');
const {validateTopics}=require('@collegehubs/contracts/learn-topics.cjs');
function selectTopics(body,items){
  if(!body || Object.keys(body).join(',')!=='nodeIds' || !Array.isArray(body.nodeIds) || body.nodeIds.length<1 || body.nodeIds.length>5 || new Set(body.nodeIds).size!==body.nodeIds.length || body.nodeIds.some(id=>typeof id!=='string'||!items.some(item=>item.nodeId===id))) throw failure(400,'INVALID_TOPICS','Choose up to five currently suggested topics.');
  return validateTopics(body.nodeIds.map(id=>items.find(item=>item.nodeId===id)));
}
function createRecommendationService(read){
  async function suggestions(principal){const owner=await requireHubAccess(principal);const data=await read(owner);const current=await requireHubAccess(principal,owner.hubId);if(current.membershipVersion!==owner.membershipVersion)throw failure(403,'MEMBERSHIP_CHANGED','Sign in again.');return {schemaVersion:1,...data};}
  async function issue(principal,body){
    const owner=await requireHubAccess(principal);
    // Never trust cached browser IDs or labels. Re-read the current owned assessment results.
    const topics=selectTopics(body,(await read(owner)).items);
    const current=await requireHubAccess(principal,owner.hubId);if(current.membershipVersion!==owner.membershipVersion)throw failure(403,'MEMBERSHIP_CHANGED','Sign in again.');
    const recommendationRef=opaque(),expiresAt=new Date(Date.now()+60000);
    await ModuleGrant.create({kind:'recommendation',module:'interview',hubId:owner.hubId,userId:owner.userId,membershipVersion:owner.membershipVersion,
      recommendationHash:digest(recommendationRef),grantHash:digest('recommendation:'+recommendationRef),topics,expiresAt,retainUntil:expiresAt});
    return {recommendationRef,expiresAt:expiresAt.toISOString()};
  }
  async function consume(credential,body){
    if(credential.service!=='interview')throw failure(403,'SERVICE_MODULE_FORBIDDEN','Interview service required.');
    const fields=['recommendationRef','userId','hubId','membershipVersion','accessJti'];
    if(!body||Object.keys(body).length!==fields.length||fields.some(k=>!Object.hasOwn(body,k))||typeof body.recommendationRef!=='string'||!/^[a-zA-Z0-9_-]{43}$/.test(body.recommendationRef)||!Number.isSafeInteger(body.membershipVersion)||!['userId','hubId'].every(k=>/^[a-f0-9]{24}$/.test(body[k]||''))||typeof body.accessJti!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(body.accessJti))throw failure(400,'INVALID_RECOMMENDATION','Invalid recommendation.');
    const owner=await requireHubAccess({sub:body.userId},body.hubId);
    if(owner.membershipVersion!==body.membershipVersion)throw failure(403,'MEMBERSHIP_CHANGED','Sign in again.');
    const at=new Date();
    const session=await ModuleGrant.findOne({module:'interview',userId:body.userId,hubId:body.hubId,membershipVersion:body.membershipVersion,accessJti:body.accessJti,accessExpiresAt:{$gt:at},consumedAt:{$ne:null}});
    if(!session || session.kind==='recommendation')throw failure(401,'INTERVIEW_SESSION_REQUIRED','A current Interview session is required.');
    const filter={kind:'recommendation',module:'interview',recommendationHash:digest(body.recommendationRef),userId:body.userId,hubId:body.hubId,membershipVersion:body.membershipVersion,consumedAt:null,expiresAt:{$gt:at}};
    const row=await ModuleGrant.findOneAndUpdate(filter,{$set:{consumedAt:at}},{new:true});
    if(!row)throw failure(409,'RECOMMENDATION_INVALID','Recommendation expired or already used. Select topics again.');
    return {topics:validateTopics(row.topics.map(t=>({nodeId:t.nodeId,label:t.label,version:t.version,reason:t.reason,asOf:t.asOf.toISOString()})))};
  }
  return {suggestions,issue,consume};
}
module.exports={selectTopics,createRecommendationService};
