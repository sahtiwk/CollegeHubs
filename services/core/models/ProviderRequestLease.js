const mongoose=require('mongoose');
const schema=new mongoose.Schema({_id:{type:String,enum:['codeforces']},nextAt:{type:Date,default:()=>new Date(0)}},{versionKey:false,strict:'throw'});
module.exports=mongoose.model('ProviderRequestLease',schema);
