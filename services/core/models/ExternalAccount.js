const mongoose=require('mongoose');
const schema=new mongoose.Schema({
  userId:{type:mongoose.Schema.Types.ObjectId,required:true,immutable:true},hubId:{type:mongoose.Schema.Types.ObjectId,required:true},
  provider:{type:String,enum:['codeforces'],required:true,immutable:true},handle:{type:String,required:true,maxlength:24},
  bindingVersion:{type:Number,required:true,min:1},membershipVersion:{type:Number,required:true},
  status:{type:String,enum:['pending','verified','unlinked'],required:true},verified:{type:Boolean,default:false},
  challenge:String,challengeExpiresAt:Date,reviewedAt:Date,reviewer:String,proofHash:String,
  appliedBonus:{type:Number,default:0,min:0,validate:Number.isSafeInteger},
  nextAttemptAt:{type:Date,default:()=>new Date(0)},leaseUntil:{type:Date,default:()=>new Date(0)},leaseId:String,
  lastError:String,lastAttemptAt:Date,
},{timestamps:true,strict:'throw'});
schema.index({userId:1,provider:1},{unique:true});
schema.index({provider:1,handle:1},{unique:true,partialFilterExpression:{verified:true}});
schema.index({hubId:1,userId:1});
module.exports=mongoose.model('ExternalAccount',schema);
