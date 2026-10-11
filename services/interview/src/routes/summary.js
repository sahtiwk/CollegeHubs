const { authorizeRead } = require('@collegehubs/contracts/module-read.cjs');
module.exports = (Model, config) => async (req, res, next) => {
  try {
    const principal = authorizeRead(req, config, 'interview');
    const owner = { userId: principal.sub, hubId: principal.hubId };
    const filters = { completedInterviews: { status: 'completed' }, pending: { deliveryStatus: 'pending' } };
    const entries = await Promise.all(Object.entries(filters).map(async ([key, filter]) => [key, await Model.countDocuments({ ...filter, ...owner }).maxTimeMS(500)]));
    res.json({ status: 'ok', asOf: new Date().toISOString(), ...Object.fromEntries(entries) });
  } catch (error) { next(error); }
};
