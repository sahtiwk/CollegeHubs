const {fail,exact}=require('../errors');
function transition(game,input,now){
  if(!exact(input,['seq','guess'])||!Number.isSafeInteger(input.seq)||input.seq<1||input.seq>10||!Number.isSafeInteger(input.guess)||input.guess<1||input.guess>100)throw fail(400,'INVALID_ACTION','Enter an integer from 1 to 100.');
  const previous=game.actions.find(row=>row.seq===input.seq);
  if(previous){if(previous.guess!==input.guess)throw fail(409,'ACTION_CONFLICT','This attempt already has a different guess.');return previous.toObject?previous.toObject():previous;}
  if(game.status!=='active'||+game.expiresAt<=+now)throw fail(409,'GAME_CLOSED','This game has ended.');
  if(input.seq!==game.actions.length+1)throw fail(409,'ACTION_ORDER','Reload the saved game before guessing.');
  const status=input.guess===game.target?'won':input.seq===10?'lost':'active';
  return {...input,hint:status==='won'?'correct':status==='lost'?'finished':input.guess<game.target?'higher':'lower',status};
}
module.exports={transition};
