const mongoose=require('mongoose');
const schema=new mongoose.Schema({
  accountId:{type:mongoose.Schema.Types.ObjectId,required:true,unique:true},userId:{type:mongoose.Schema.Types.ObjectId,required:true},hubId:{type:mongoose.Schema.Types.ObjectId,required:true},
  provider:{type:String,enum:['codeforces'],required:true},handle:String,bindingVersion:{type:Number,required:true},
  rating:{type:Number,required:true,validate:Number.isSafeInteger},fetchedAt:{type:Date,required:true},sourceUrl:{type:String,required:true},
  formulaVersion:{type:String,required:true},appliedBonus:{type:Number,required:true,min:0},
},{strict:'throw'});
schema.index({hubId:1,userId:1});
module.exports=mongoose.model('ExternalSnapshot',schema);
