const express = require('express');
const { randomBytes, createHash } = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const { tryAssignMembership } = require('../services/hubProvisioning');
const { userDto } = require('../utils/userDto');
const { bodyObject, text, respondError } = require('../utils/validation');
const { authenticate } = require('../middleware/auth');
const google = require('../services/googleIdentity');
const router = express.Router();
const digest=value=>createHash('sha256').update(value).digest('hex');
const failure=(status,message)=>Object.assign(new Error(message),{status});
function replyError(res,err){if([401,403,409,503].includes(err.status))return res.status(err.status).json({error:err.message,...(err.status===401?{code:'GOOGLE_IDENTITY_INVALID'}:{})});return respondError(res,err,'Google account operation unavailable');}
function sameOrigin(req,res,next){if(!(process.env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).includes(req.get('Origin')))return res.status(403).json({error:'Linking requires the application origin'});next();}
router.post('/auth', async (req, res) => {
 try {
  const credential=text(bodyObject(req.body).credential,'Google ID token',16384,true);
  const {info,email,trustedEmail}=await google.verifyCredential(credential);
  let user=await User.findOne({googleSubject:info.sub}).select('+googleSubject +googleLinkedEmail +emailVerifiedAt +emailVerificationMethod');
  if(user && (user.googleLinkedEmail||user.email)!==email)throw failure(409,'Google email changed. Account recovery requires review.');
  if(!user){
   if(await User.findOne({email}))throw failure(409,'An account with this email exists. Sign in with its existing method, then link Google in account settings.');
   const prefix=email.split('@')[0].replace(/[^a-z0-9_.-]/g,'_').slice(0,30)||'user';
   user=await User.create({googleSubject:info.sub,googleLinkedEmail:email,username:`${prefix}_${randomBytes(6).toString('hex')}`,email,emailVerifiedAt:trustedEmail?new Date():null,emailVerificationMethod:trustedEmail?'google':'none'});
  }else if(email===user.email){
   if(user.emailVerificationMethod!=='email'){user.emailVerifiedAt=trustedEmail?new Date():null;user.emailVerificationMethod=trustedEmail?'google':'none';}
   if(!user.emailVerifiedAt&&user.membershipStatus==='active'){user.membershipVerified=false;user.membershipStatus='verification-pending';user.membershipVersion+=1;}
   await user.save();
  }
  const result=await tryAssignMembership(user);
  res.json({token:await require('../services/coreSessionService').issue(req, res, result.user),user:await userDto(result.user,true),assignment:result.assignment});
 }catch(err){replyError(res,err);}
});
router.post('/link/start',authenticate,sameOrigin,async(req,res)=>{
 try{
  if(Object.keys(bodyObject(req.body)).length)throw failure(400,'Use an empty object');
  if(!google.capability().available)throw failure(503,'Google linking is not configured');
  const user=await User.findById(req.user._id).select('+googleSubject');
  if(user.membershipStatus==='disabled')throw failure(403,'Account linking is unavailable for this account');
  if(user.googleSubject)throw failure(409,'Google is already linked');
  const nonce=randomBytes(32).toString('base64url');
  await User.updateOne({_id:user._id},{$set:{googleLinkNonceHash:digest(nonce),googleLinkExpiresAt:new Date(Date.now()+300000)}});
  res.json({nonce,expiresInSeconds:300});
 }catch(err){replyError(res,err);}
});
router.post('/link',authenticate,sameOrigin,async(req,res)=>{
 try{
  const body=bodyObject(req.body);if(Object.keys(body).some(k=>!['credential','nonce'].includes(k)))throw failure(400,'Unexpected linking field');
  const nonce=text(body.nonce,'Linking nonce',100,true),credential=text(body.credential,'Google ID token',16384,true);
  const {info,email}=await google.verifyCredential(credential,{fresh:true,nonce});
  const user=await mongoose.connection.transaction(async session=>{
   const current=await User.findById(req.user._id).select('+googleSubject +googleLinkNonceHash +googleLinkExpiresAt').session(session);
   if(!current||current.membershipStatus==='disabled')throw failure(403,'Linking unavailable');
   if(current.membershipVersion!==req.auth.membershipVersion)throw failure(409,'Sign-in changed. Sign in again before linking.');
   if(current.googleSubject||current.googleLinkNonceHash!==digest(nonce)||!current.googleLinkExpiresAt||current.googleLinkExpiresAt<=new Date())throw failure(409,'Linking expired or already completed. Start again.');
   // Explicit linking proves two identities. It never merges another account or changes email/membership proof.
   if(await User.exists({_id:{$ne:current._id},$or:[{googleSubject:info.sub},{email}]}).session(session))throw failure(409,'This Google account belongs to another account. Accounts cannot be merged.');
   current.googleSubject=info.sub;current.googleLinkedEmail=email;current.googleLinkNonceHash=undefined;current.googleLinkExpiresAt=undefined;current.membershipVersion+=1;
   await current.save({session});return current;
  });
  res.json({token:await require('../services/coreSessionService').issue(req, res, user),user:await userDto(user,true)});
 }catch(err){replyError(res,err);}
});
module.exports=router;
