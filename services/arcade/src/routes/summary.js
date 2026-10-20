const { authorizeRead } = require('@collegehubs/contracts/module-read.cjs');
module.exports = (Model, config) => async (req, res, next) => {
  try {
    const principal = authorizeRead(req, config, 'arcade');
    const owner = { userId: principal.sub, hubId: principal.hubId };
    const filters = { completedGames: { status: { $in: ['won', 'lost'] } }, wins: { status: 'won' }, pending: { deliveryStatus: 'pending' } };
    const entries = await Promise.all(Object.entries(filters).map(async ([key, filter]) => [key, await Model.countDocuments({ ...filter, ...owner }).maxTimeMS(500)]));
    const recent=await Model.findOne({...owner,$or:[{status:'active',expiresAt:{$gt:new Date()}},{status:{$in:['won','lost']}}]}).sort({createdAt:-1,_id:-1}).select('_id status gameId').maxTimeMS(500).lean();
    res.json({ schemaVersion:2, next:recent?{kind:'game',id:String(recent._id),gameId:recent.gameId}:null, status: 'ok', asOf: new Date().toISOString(), ...Object.fromEntries(entries) });
  } catch (error) { next(error); }
};
