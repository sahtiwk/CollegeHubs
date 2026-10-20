const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { getUserHubs } = require('../services/hubAccess');
const { tryAssignMembership } = require('../services/hubProvisioning');
const { userDto } = require('../utils/userDto');
const { bodyObject, profileFields, respondError } = require('../utils/validation');
router.use(authenticate);
router.post('/email-change', async (req,res) => {
  try {
    const body=bodyObject(req.body);
    if(Object.keys(body).some(key=>key!=='email'))return res.status(400).json({error:'Only the replacement email is accepted'});
    const email=require('../utils/validation').emailAddress(body.email);
    res.status(202).json(await require('../services/emailVerification').requestVerification(req.user._id,email));
  } catch(err) { const status=[400,403,409,429,503].includes(err.status)?err.status:503;res.status(status).json({error:err.status?err.message:'Email change unavailable',code:err.code||'EMAIL_CHANGE_UNAVAILABLE'}); }
});
router.delete('/email-change', async (req,res) => {
  try { await require('../services/emailVerification').cancelEmailChange(req.user._id);res.json({status:'cancelled'}); }
  catch {res.status(503).json({error:'Cancellation unavailable'});}
});
router.get('/hub', require('../services/hubAccess').requireTenant, async (req, res) => {
  try {
    const hub = await require('../models/Hub').findOne({ _id: req.hub.hubId, status: 'active' });
    if (!hub) return res.status(403).json({ error: 'Hub unavailable' });
    res.set('Cache-Control', 'no-store').json(require('../services/hubPresentation').hubPresentation(hub));
  } catch { res.status(503).json({ error: 'Hub unavailable' }); }
});
router.get('/', async (req, res) => {
  try { res.set('Cache-Control', 'no-store').json({ ...await userDto(req.user, true), hubs: await getUserHubs(req.user) }); }
  catch { res.status(503).json({ error: 'Membership check unavailable' }); }
});
router.patch('/', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user._id, { $set: profileFields(req.body) }, { new: true, runValidators: true });
    res.json(await userDto(user, true));
  } catch (err) { respondError(res, err, 'Failed to save profile'); }
});
router.post('/assignment/retry', async (req, res) => {
  try {
    if (Object.keys(bodyObject(req.body)).length) return res.status(400).json({ error: 'Assignment retry accepts an empty object only' });
    const result = await tryAssignMembership(req.user);
    res.json({ ...result, user: await userDto(result.user, true), token: await require('../services/coreSessionService').issue(req, res, result.user) });
  } catch (err) { respondError(res, err, 'Assignment retry unavailable'); }
});
module.exports = router;
