const mongoose = require('mongoose');
const schema = new mongoose.Schema({
 userId: {type:mongoose.Schema.Types.ObjectId,required:true,index:true},
 email: {type:String,required:true}, baseEmail: String, purpose: {type:String,enum:['membership','email-change'],required:true},
 tokenHash: {type:String,required:true}, expiresAt: {type:Date,required:true},
 attempts: {type:Number,default:0}, maxAttempts: {type:Number,default:5},
 delivery: {type:String,enum:['pending','sent','failed'],default:'pending'},
 consumedAt: {type:Date,default:null}, supersededAt: {type:Date,default:null},
}, {timestamps:true});
schema.index({expiresAt:1},{expireAfterSeconds:86400}); // Retention only; never authorization.
module.exports=mongoose.model('VerificationChallenge',schema);
