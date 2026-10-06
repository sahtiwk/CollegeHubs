require('dotenv').config({path:require('node:path').join(__dirname,'../.env')});
const mongoose=require('mongoose');
async function start(){
  const config=require('./auth/config').configuration();
  if(!process.env.ARCADE_MONGO_URI||! /^[a-zA-Z0-9_-]{43}$/.test(process.env.ARCADE_RECONCILE_KEY||''))throw Error('Arcade database and reconcile configuration required');
  config.reconcileKey=process.env.ARCADE_RECONCILE_KEY;
  const connection=await mongoose.createConnection(process.env.ARCADE_MONGO_URI,{serverSelectionTimeoutMS:3000,bufferCommands:false,autoCreate:false,autoIndex:false}).asPromise();
  const models={...require('./models/ModuleSession')(connection),GameSession:require('./models/GameSession')(connection)};
  await Promise.all(Object.values(models).map(async model=>{await model.createCollection();await model.createIndexes();}));
  const app=require('./app').createApp({connection,models,config});const server=app.listen(process.env.PORT||5001,()=>console.log('Arcade API listening'));
  const close=()=>{server.close();void connection.close().finally(()=>process.exit());};process.on('SIGTERM',close);process.on('SIGINT',close);
}
start().catch(()=>{console.error('Arcade startup failed; verify its own database, public key, origins and service configuration.');process.exitCode=1;});
