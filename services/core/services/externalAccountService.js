const mongoose=require('mongoose'),{randomUUID,randomBytes,createHash}=require('node:crypto');
const Account=require('../models/ExternalAccount'),Snapshot=require('../models/ExternalSnapshot'),Balance=require('../models/AuraBalance');
const {accessError}=require('./hubAccess'),{config,capabilities}=require('../config/externalProviders'),adapter=require('../integrations/codeforcesStats');
const FRESH_MS=24*3600000,RETRY_MS=15*60000;
const fail=(status,code,message)=>accessError(status,code,message);
async function transaction(work){for(let n=0;n<4;n++){try{return await mongoose.connection.transaction(work,{readConcern:{level:'snapshot'},writeConcern:{w:'majority'},maxCommitTimeMS:5000,timeoutMS:10000});}catch(e){if(e.code!==11000||n===3)throw e;}}}
async function active(context,session){
  const User=require('../models/User'),Hub=require('../models/Hub'),College=require('../models/College');
  const user=await User.findOne({_id:context.userId,hubId:context.hubId,membershipVersion:context.membershipVersion}).session(session);
  const hub=await Hub.findOne({_id:context.hubId,status:'active'}).session(session);
  if(!user||!require('./membershipPolicy').hasMembershipAuthority(user)||!hub||!await College.exists({_id:hub.collegeId,status:'active'}).session(session))throw fail(403,'MEMBERSHIP_CHANGED','Current membership is required');
}
async function delta(account,amount,session){
  const difference=amount-account.appliedBonus;
  if(difference)await Balance.updateOne({hubId:account.hubId,userId:account.userId},{$inc:{externalBonus:difference,total:difference,version:1},$set:{asOf:new Date()},$setOnInsert:{engagement:0}},{upsert:true,session});
  account.appliedBonus=amount;
}
function providerAllowed(provider){if(provider!=='codeforces'||!config().codeforces)throw fail(503,'PROVIDER_DISABLED','This provider is not enabled');}
async function link(context,input){
  if(!input||Array.isArray(input)||Object.keys(input).length!==2||!Object.hasOwn(input,'provider')||!Object.hasOwn(input,'handle'))throw fail(400,'INVALID_BODY','Send provider and handle only');
  providerAllowed(input.provider);const name=adapter.handle(input.handle);
  return transaction(async session=>{
    await active(context,session);
    let row=await Account.findOne({userId:context.userId,provider:input.provider}).session(session);
    if(row&&String(row.hubId)!==String(context.hubId))throw fail(409,'BINDING_HUB_CHANGED','Contact an operator about the retained binding');
    if(row&&row.membershipVersion===context.membershipVersion&&row.status!=='unlinked'&&row.handle===name&&(row.verified||+row.challengeExpiresAt>Date.now()))return {status:row.status,bindingVersion:row.bindingVersion};
    if(row&&+row.updatedAt>Date.now()-60000)throw fail(429,'LINK_COOLDOWN','Wait a minute before changing the handle or challenge');
    if(!row)row=new Account({userId:context.userId,hubId:context.hubId,provider:input.provider,bindingVersion:0,appliedBonus:0});
    await delta(row,0,session);
    Object.assign(row,{handle:name,bindingVersion:row.bindingVersion+1,membershipVersion:context.membershipVersion,status:'pending',verified:false,challenge:'ch-'+randomBytes(16).toString('base64url'),challengeExpiresAt:new Date(Date.now()+24*3600000),reviewedAt:null,reviewer:null,proofHash:null,leaseId:null,leaseUntil:new Date(0),nextAttemptAt:new Date(0),lastError:null});
    await row.save({session});return {status:'pending',bindingVersion:row.bindingVersion};
  });
}
async function unlink(context,provider){
  if(provider!=='codeforces')throw fail(400,'INVALID_PROVIDER','Unknown provider');
  await transaction(async session=>{
    await active(context,session);const row=await Account.findOne({userId:context.userId,hubId:context.hubId,provider}).session(session);if(!row||row.status==='unlinked')return;
    await delta(row,0,session);Object.assign(row,{status:'unlinked',verified:false,bindingVersion:row.bindingVersion+1,challenge:null,challengeExpiresAt:null,proofHash:null,reviewer:null,reviewedAt:null,leaseId:null,leaseUntil:new Date(0)});await row.save({session});
    await Snapshot.deleteOne({accountId:row.id},{session});
  });return {status:'unlinked'};
}
async function review({accountId,bindingVersion,reviewer},{load=adapter.fetchStats}={}){
  providerAllowed('codeforces');
  if(!/^[a-f0-9]{24}$/.test(accountId)||!Number.isSafeInteger(bindingVersion)||typeof reviewer!=='string'||!/^[a-zA-Z0-9_.@-]{3,100}$/.test(reviewer))throw fail(400,'INVALID_REVIEW','Exact account, version and reviewer are required');
  const now=new Date(),lease=randomUUID();
  const row=await Account.findOneAndUpdate({_id:accountId,bindingVersion,status:'pending',challengeExpiresAt:{$gt:now},nextAttemptAt:{$lte:now},leaseUntil:{$lte:now}},{$set:{leaseId:lease,leaseUntil:new Date(+now+30000),nextAttemptAt:new Date(+now+RETRY_MS)}});
  if(!row)throw fail(409,'REVIEW_NOT_DUE','Binding changed, challenge expired or review is cooling down');
  try{
    const data=await load(row.handle);
    if(data.handle!==row.handle||data.organization!==row.challenge)throw fail(409,'OWNERSHIP_NOT_PROVEN','The exact challenge is not present in the provider profile organization field');
    await transaction(async session=>{
      const current=await Account.findOne({_id:accountId,bindingVersion,status:'pending',leaseId:lease,challenge:row.challenge,challengeExpiresAt:{$gt:new Date()}}).session(session);
      if(!current)throw fail(409,'BINDING_CHANGED','Binding changed during review');
      await active({userId:current.userId,hubId:current.hubId,membershipVersion:current.membershipVersion},session);
      Object.assign(current,{status:'verified',verified:true,reviewedAt:new Date(),reviewer,proofHash:createHash('sha256').update(row.challenge).digest('hex'),challenge:null,challengeExpiresAt:null,nextAttemptAt:new Date(0),leaseId:null,leaseUntil:new Date(0),lastError:null});
      await current.save({session});
    });return {status:'verified'};
  }catch(error){await Account.updateOne({_id:accountId,bindingVersion,leaseId:lease},{$set:{leaseId:null,leaseUntil:new Date(0),lastError:'OWNERSHIP_REVIEW_FAILED'}});if(error.code===11000)throw fail(409,'HANDLE_ALREADY_VERIFIED','This provider handle is already verified elsewhere');throw error;}
}
async function refresh(context,{load=adapter.fetchStats}={}){
  providerAllowed('codeforces');const now=new Date(),lease=randomUUID();
  const row=await Account.findOneAndUpdate({userId:context.userId,hubId:context.hubId,membershipVersion:context.membershipVersion,provider:'codeforces',verified:true,status:'verified',nextAttemptAt:{$lte:now},leaseUntil:{$lte:now}},{$set:{leaseId:lease,leaseUntil:new Date(+now+30000),nextAttemptAt:new Date(+now+RETRY_MS),lastAttemptAt:now}},{new:true});
  if(!row)return {status:'deferred'};
  try{
    const data=await load(row.handle);
    if(data.handle!==row.handle||!Number.isSafeInteger(data.rating)||data.rating < -10000||data.rating>10000)throw Error('Invalid provider data');
    return await transaction(async session=>{
      await active(context,session);
      const current=await Account.findOne({_id:row.id,bindingVersion:row.bindingVersion,verified:true,leaseId:lease}).session(session);if(!current)return {status:'discarded'};
      const amount=config().bonus?require('../config/externalBonus').amount({rating:data.rating}):0,at=new Date();await delta(current,amount,session);
      await Snapshot.updateOne({accountId:row.id},{$set:{userId:row.userId,hubId:row.hubId,provider:'codeforces',handle:row.handle,bindingVersion:row.bindingVersion,rating:data.rating,fetchedAt:at,sourceUrl:'https://codeforces.com/profile/'+encodeURIComponent(row.handle),formulaVersion:'cf-current-rating-v1',appliedBonus:amount}},{upsert:true,runValidators:true,session});
      Object.assign(current,{lastError:null,leaseId:null,leaseUntil:new Date(0),nextAttemptAt:new Date(+at+FRESH_MS)});await current.save({session});return {status:'updated'};
    });
  }catch{await Account.updateOne({_id:row.id,bindingVersion:row.bindingVersion,leaseId:lease},{$set:{lastError:'PROVIDER_UNAVAILABLE',leaseId:null,leaseUntil:new Date(0)}});return {status:'unavailable'};}
}
async function read(context){
  const rows=await Account.find({userId:context.userId,hubId:context.hubId,status:{$ne:'unlinked'}}).maxTimeMS(2000).lean();
  const items=[];for(const row of rows){const snapshot=await Snapshot.findOne({accountId:row._id,bindingVersion:row.bindingVersion,userId:context.userId,hubId:context.hubId}).maxTimeMS(2000).lean();items.push({id:String(row._id),provider:row.provider,handle:row.handle,status:row.status,bindingVersion:row.bindingVersion,challenge:row.status==='pending'?row.challenge:null,challengeExpiresAt:row.challengeExpiresAt,reviewedAt:row.reviewedAt,nextAttemptAt:row.nextAttemptAt,lastError:row.lastError,appliedBonus:row.appliedBonus,snapshot:snapshot?{rating:snapshot.rating,fetchedAt:snapshot.fetchedAt,sourceUrl:snapshot.sourceUrl,stale:!!row.lastError||Date.now()-snapshot.fetchedAt>=FRESH_MS}:null});}
  return {capabilities:capabilities(),items};
}
module.exports={link,unlink,review,refresh,read,FRESH_MS};
