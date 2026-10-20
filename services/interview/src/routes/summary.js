const { authorizeRead } = require('@collegehubs/contracts/module-read.cjs');
module.exports = (Model, config) => async (req, res, next) => {
  try {
    const principal = authorizeRead(req, config, 'interview');
    const owner = { userId: principal.sub, hubId: principal.hubId };
    const filters = { completedInterviews: { status: 'completed' }, pending: { deliveryStatus: 'pending' } };
    const entries = await Promise.all(Object.entries(filters).map(async ([key, filter]) => [key, await Model.countDocuments({ ...filter, ...owner }).maxTimeMS(500)]));
    const recent=await Model.findOne({...owner,status:{$in:['active','evaluating','evaluation_failed','completed']}}).sort({createdAt:-1,_id:-1}).select('_id status gameId').maxTimeMS(500).lean();
    res.json({ schemaVersion:2, next:recent?{kind:recent.status==='completed'?'report':'session',id:String(recent._id)}:null, status: 'ok', asOf: new Date().toISOString(), ...Object.fromEntries(entries) });
  } catch (error) { next(error); }
};
