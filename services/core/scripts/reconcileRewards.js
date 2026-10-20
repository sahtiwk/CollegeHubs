require('dotenv').config({path:require('node:path').join(__dirname,'../.env')});
const mongoose=require('mongoose');
async function main(){
 const database=process.argv[2]?.replace(/^--database=/,'');
 if(process.argv.length!==3||!process.argv[2].startsWith('--database=')||!database||new URL(process.env.MONGO_URI).pathname!=='/'+database||['admin','local','config'].includes(database))throw Error('target');
 await mongoose.connect(process.env.MONGO_URI,{serverSelectionTimeoutMS:5000});
 await require('../models/ReconciliationLease').init();
 console.log(JSON.stringify(await require('../services/reconciliationCoordinator').createCoordinator().tick()));
}
main().catch(()=>{console.error('Reconciliation failed; verify explicit database and service configuration.');process.exitCode=1;}).finally(()=>mongoose.disconnect());
