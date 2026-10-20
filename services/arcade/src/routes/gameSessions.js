const {Router}=require('express');const {wrap,cookie}=require('../auth/sessionRoutes');
function gameRoutes(store,games,events){const router=Router();
router.use((req,res,next)=>{store.get(cookie(req,'session')).then(row=>{if(!['GET','HEAD'].includes(req.method))store.mutation(row,req.get('Origin'),req.get('X-CSRF-Token'));req.arcade=row;next();}).catch(next);});
router.get('/daily',wrap(async(req,res)=>res.json(await games.daily(req.arcade))));
router.post('/daily',wrap(async(req,res)=>res.json({game:await games.createDaily(req.arcade,req.body)})));
router.get('/games',wrap(async(req,res)=>res.json({items:require('@collegehubs/contracts/arcade-games.json').map(game=>({...game,enabled:game.status==='ranked'&&process.env.ARCADE_GAMES_ENABLED!=='false'}))})));
router.post('/sessions',wrap(async(req,res)=>res.status(201).json({game:await games.create(req.arcade,req.body)})));
router.get('/me/activity',wrap(async(req,res)=>res.json(await games.activity(req.arcade))));
router.get('/sessions/:id',wrap(async(req,res)=>{const game=await games.read(req.arcade,req.params.id);if(game.deliveryStatus==='pending')events.trigger(game.id);res.json({game});}));
router.post('/sessions/:id/actions',wrap(async(req,res)=>{const result=await games.action(req.arcade,req.params.id,req.body);if(result.game.deliveryStatus==='pending')events.trigger(result.game.id);res.json(result);}));
router.post('/sessions/:id/complete',wrap(async(req,res)=>{const game=await games.complete(req.arcade,req.params.id,req.body);if(game.deliveryStatus==='pending')events.trigger(game.id);res.json({game});}));
return router;}
module.exports={gameRoutes};
