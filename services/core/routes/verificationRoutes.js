const express=require('express');
const {authenticate}=require('../middleware/auth');
const {bodyObject}=require('../utils/validation');
const {requestVerification,consumeVerification}=require('../services/emailVerification');
const {userDto}=require('../utils/userDto');
const router=express.Router();
router.use(authenticate);
function error(res,err){const status=[400,403,409,429,503].includes(err.status)?err.status:503;if(status===429)res.set('Retry-After','60');res.status(status).json({error:status===503?'Verification unavailable. Your account is saved.':err.message,code:err.code||'VERIFICATION_UNAVAILABLE'});}
router.post('/request',async(req,res)=>{try{if(Object.keys(bodyObject(req.body)).length)return res.status(400).json({error:'Use an empty object; the signed-in email is selected by the server.'});res.status(202).json(await requestVerification(req.user._id));}catch(err){error(res,err);}});
router.post('/consume',async(req,res)=>{try{const body=bodyObject(req.body);if(Object.keys(body).some(k=>!['challengeId','token'].includes(k)))return res.status(400).json({error:'Unexpected verification field'});const user=await consumeVerification(req.user._id,body);res.json({token:await require('../services/coreSessionService').issue(req, res, user),user:await userDto(user,true)});}catch(err){error(res,err);}});
module.exports=router;
