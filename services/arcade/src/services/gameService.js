const { randomInt }=require('node:crypto'); const {fail,exact}=require('../errors'); const {transition}=require('../validators/numberGuess');
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
function createGameService(connection,Game){
  const now=async()=>{const result=await connection.db.command({hello:1});return result.localTime;};
  const scope=row=>({userId:row.user_id,hubId:row.hub_id});
  const dto=(game,at=new Date())=>({id:String(game._id),gameId:game.gameId,rulesVersion:game.rulesVersion,status:game.status==='active'&&+game.expiresAt<=+at?'expired':game.status,createdAt:game.createdAt,expiresAt:game.expiresAt,serverNow:at,actions:game.actions.map(a=>({seq:a.seq,guess:a.guess,hint:a.hint,status:a.status})),completedAt:game.completedAt||null,deliveryStatus:game.deliveryStatus,receipt:game.receipt?{eventId:game.receipt.eventId,awardedAura:game.receipt.awardedAura,reason:game.receipt.reason,dayKey:game.receipt.dayKey}:null});
  async function owned(row,id,session=null){if(!/^[a-f0-9]{24}$/.test(id||''))throw fail(404,'GAME_NOT_FOUND');const game=await Game.findOne({_id:id,...scope(row)}).select('+target').session(session);if(!game)throw fail(404,'GAME_NOT_FOUND');return game;}
  async function create(row,input){
    if(!exact(input,['clientSessionId','gameId'])||input.gameId!=='numberguess'||!uuid.test(input.clientSessionId||''))throw fail(400,'INVALID_GAME');
    const existing=await Game.findOne({...scope(row),clientSessionId:input.clientSessionId});if(existing)return dto(existing);
    if(process.env.ARCADE_GAMES_ENABLED==='false')throw fail(503,'ARCADE_GAMES_DISABLED','New games are temporarily disabled.');
    const at=await now();if(row.principal.exp*1000<=+at)throw fail(401,'ARCADE_SESSION_REQUIRED');
    if(await Game.countDocuments({...scope(row),status:'active',expiresAt:{$gt:at}})>=5)throw fail(429,'ACTIVE_GAME_LIMIT','Finish an active game or wait for its expiry.');
    try{return dto(await Game.create({...scope(row),...input,rulesVersion:'numberguess-v1',target:randomInt(1,101),createdAt:at,expiresAt:new Date(+at+600000)}),at);}
    catch(error){if(error.code!==11000)throw error;return dto(await Game.findOne({...scope(row),clientSessionId:input.clientSessionId}));}
  }
  async function action(row,id,input){
    return connection.transaction(async session=>{
      const game=await owned(row,id,session),at=await now();
      if(row.principal.exp*1000<=+at)throw fail(401,'ARCADE_SESSION_REQUIRED');
      const step=transition(game,input,at);
      if(input.seq<=game.actions.length)return {transition:step,game:dto(game,at)};
      game.actions.push(step);game.status=step.status;
      if(step.status!=='active'){
        game.completedAt=at;
        if(step.status==='won'){
          game.event={schemaVersion:1,eventId:`arcade:${game._id}:completed:v1`,userId:row.user_id,hubId:row.hub_id,source:'arcade',type:'arcade.game_completed',value:1,occurredAt:at.toISOString(),metadata:{sourceId:String(game._id),accessJti:row.principal.jti,domainVersion:'v1',gameId:'numberguess',rulesVersion:'numberguess-v1',outcome:'success',serverDurationSeconds:Math.max(0,Math.floor((+at-+game.createdAt)/1000))}};
          game.deliveryStatus='pending';
        }
      }
      await game.save({session});return {transition:step,game:dto(game,at)};
    },{readConcern:{level:'snapshot'},writeConcern:{w:'majority'},maxCommitTimeMS:5000});
  }
  async function read(row,id){return dto(await owned(row,id),await now());}
  async function activity(row){return {items:(await Game.find(scope(row)).sort({createdAt:-1,_id:-1}).limit(20)).map(game=>dto(game))};}
  async function complete(row,id,input){if(!exact(input,[]))throw fail(400,'INVALID_COMPLETION');const game=await owned(row,id);if(!['won','lost'].includes(game.status))throw fail(409,'GAME_NOT_COMPLETE');return dto(game);}
  return {create,action,read,activity,complete,owned,dto};
}
module.exports={createGameService};
