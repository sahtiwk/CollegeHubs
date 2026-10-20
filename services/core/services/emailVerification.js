const {randomBytes,createHash,timingSafeEqual}=require('node:crypto');
const mongoose=require('mongoose');
const User=require('../models/User');
const Challenge=require('../models/VerificationChallenge');
const mail=require('./verificationMail');
const {assignMembership}=require('./hubProvisioning');
const College=require('../models/College');
const Hub=require('../models/Hub');
const {activeDomainFilter}=require('../config/collegeRegistry');
async function validateReplacement(user,email,session) {
 const college=await College.findOne(activeDomainFilter(email)).session(session);
 if(!college) throw fail(400,'COLLEGE_DOMAIN_NOT_CONFIGURED','Choose an email from a configured college domain.');
 if(user.hubId && !await Hub.exists({_id:user.hubId,collegeId:college._id,status:'active'}).session(session)) throw fail(409,'COLLEGE_TRANSFER_FORBIDDEN','Changing colleges requires administrator review. Your existing work will not be moved.');
 if(await User.exists({_id:{$ne:user._id},email}).session(session)) throw fail(409,'EMAIL_UNAVAILABLE','This email cannot be used. Sign in with its existing account or seek account recovery.');
}
const fail=(status,code,message)=>Object.assign(new Error(message),{status,code});
const digest=token=>createHash('sha256').update(token).digest('hex');
async function requestVerification(userId,replacementEmail) {
 if(!mail.capability().available) throw fail(503,'VERIFICATION_UNAVAILABLE','Email verification is currently unavailable. Your account is saved.');
 const token=randomBytes(32).toString('base64url'), now=new Date();let challenge;
 await mongoose.connection.transaction(async session=>{
  const user=await User.findById(userId).select('+emailVerifiedAt +emailVerificationMethod +verificationRate +pendingEmail').session(session);
  if(!user||user.membershipStatus==='disabled') throw fail(403,'MEMBERSHIP_DISABLED','Verification is unavailable for this account.');
  const email=replacementEmail||user.pendingEmail||user.email;
  const changing=email!==user.email;
  if(replacementEmail && !changing) throw fail(400,'EMAIL_UNCHANGED','That is already your login email.');
  if(changing) await validateReplacement(user,email,session);
  if(!changing && user.emailVerifiedAt && ['email','google'].includes(user.emailVerificationMethod)) throw fail(409,'EMAIL_ALREADY_VERIFIED','Email is already verified. Retry college assignment instead.');
  const rate=user.verificationRate, fresh=!rate?.windowStart||now-rate.windowStart>=3600000;
  if((rate?.lastRequestedAt && now-rate.lastRequestedAt<60000)||(!fresh&&rate.count>=5)) throw fail(429,'VERIFICATION_RATE_LIMIT','Please wait before requesting another verification email.');
  if(changing) user.pendingEmail=email;
  user.verificationRate={windowStart:fresh?now:rate.windowStart,count:fresh?1:rate.count+1,lastRequestedAt:now};await user.save({session});
  await Challenge.updateMany({userId,consumedAt:null,supersededAt:null},{$set:{supersededAt:now}},{session});
  [challenge]=await Challenge.create([{userId,email,baseEmail:user.email,purpose:changing?'email-change':'membership',tokenHash:digest(token),expiresAt:new Date(+now+1800000)}],{session});
 });
 try {
  await mail.deliver({userId:String(userId),email:challenge.email,challengeId:String(challenge._id),token});
  await Challenge.updateOne({_id:challenge._id,delivery:'pending'},{$set:{delivery:'sent'}});
 } catch {
  await Challenge.updateOne({_id:challenge._id},{$set:{delivery:'failed'}});
  throw fail(503,'VERIFICATION_DELIVERY_FAILED','Verification could not be delivered. Your account is saved; please retry later.');
 }
 return {status:'pending',delivery:mail.capability().mode,retryAfterSeconds:60,expiresInSeconds:1800};
}
async function consumeVerification(userId, {challengeId,token}) {
 if(typeof challengeId!=='string'||!/^[a-f\d]{24}$/i.test(challengeId)||typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token)) throw fail(400,'VERIFICATION_INVALID','Verification is invalid or expired.');
 const result=await mongoose.connection.transaction(async session=>{
  const now=new Date();
  const user=await User.findById(userId).select('+emailVerifiedAt +emailVerificationMethod +pendingEmail +googleSubject +googleLinkedEmail').session(session);
  const challenge=await Challenge.findOne({_id:challengeId,userId,delivery:'sent',consumedAt:null,supersededAt:null,expiresAt:{$gt:now},attempts:{$lt:5}}).session(session);
  if(!user||user.membershipStatus==='disabled'||!challenge) return null;
  if(challenge.baseEmail && challenge.baseEmail!==user.email) return null;
  if(challenge.email!==(challenge.purpose==='email-change'?user.pendingEmail:user.email)) return null;
  challenge.attempts+=1;
  if(!timingSafeEqual(Buffer.from(challenge.tokenHash,'hex'),Buffer.from(digest(token),'hex'))) {await challenge.save({session});return null;}
  challenge.consumedAt=now;await challenge.save({session});
  if(challenge.purpose==='email-change') {
   await validateReplacement(user,challenge.email,session);
   if(user.googleSubject&&!user.googleLinkedEmail)user.googleLinkedEmail=user.email;
   user.email=challenge.email;user.pendingEmail=null;user.membershipVersion+=1;
   if(user.membershipVerified)user.verificationMethod='email';
  }
  user.emailVerifiedAt=now;user.emailVerificationMethod='email';await user.save({session});
  return assignMembership(user._id,session);
 });
 if(!result) throw fail(400,'VERIFICATION_INVALID','Verification is invalid or expired.');
 return result;
}
async function cancelEmailChange(userId) {
 await mongoose.connection.transaction(async session=>{
  await User.updateOne({_id:userId},{$set:{pendingEmail:null}},{session});
  await Challenge.updateMany({userId,purpose:'email-change',consumedAt:null},{$set:{supersededAt:new Date()}},{session});
 });
}
module.exports={requestVerification,consumeVerification,cancelEmailChange};
