require('dotenv').config({path:require('node:path').join(__dirname,'../.env')});
const mongoose=require('mongoose');
mongoose.set('autoCreate',false).set('autoIndex',false);
async function main(){
  const args=process.argv.slice(2),values={};
  for(const arg of args){const match=/^--(database|account|version|reviewer)=(.+)$/.exec(arg);if(!match||values[match[1]])throw Error('arguments');values[match[1]]=match[2];}
  if(args.length!==4||!values.database||['admin','local','config'].includes(values.database)||new URL(process.env.MONGO_URI).pathname!=='/'+values.database)throw Error('database');
  await mongoose.connect(process.env.MONGO_URI,{serverSelectionTimeoutMS:5000});
  console.log(JSON.stringify(await require('../services/externalAccountService').review({accountId:values.account,bindingVersion:Number(values.version),reviewer:values.reviewer})));
}
main().catch(e=>{console.error('External review refused: '+(e.status?e.code:'check configuration, database and provider availability'));process.exitCode=1;}).finally(()=>mongoose.disconnect());
