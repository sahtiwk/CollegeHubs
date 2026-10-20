const mongoose=require('mongoose');
async function main(){
 const args=process.argv.slice(2), database=args.find(x=>x.startsWith('--database='))?.slice(11), when=args.find(x=>x.startsWith('--cutover-at='))?.slice(13);
 if(args.length!==3||!database||!when||!args.some(x=>['--dry-run','--apply'].includes(x)))throw Error('Arguments required');
 if(args.includes('--apply') && process.env.NODE_ENV==='production' && !require('../services/verificationMail').capability().available)throw Error('Production mail capability required before membership cutover');
 const client=new mongoose.mongo.MongoClient(process.env.MONGO_URI||'');if(client.options.dbName!==database||['admin','local','config'].includes(database))throw Error('Explicit database mismatch');await client.close();
 await mongoose.connect(process.env.MONGO_URI);
 try{const result=await require('../services/membershipCutover').cutoverMembership({dryRun:args.includes('--dry-run'),cutoverAt:new Date(when)});console.log(JSON.stringify(result));if(result.complete===false)process.exitCode=2;}finally{await mongoose.disconnect();}
}
if(require.main===module)main().catch(()=>{console.error('Membership cutover refused or failed. Check target, announcement and elapsed cutover time. No credentials are logged.');process.exitCode=1;});
