const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { getUserHubs } = require('../services/hubAccess');
const { tryAssignMembership } = require('../services/hubProvisioning');
const { generateToken } = require('../config/auth');
const { userDto } = require('../utils/userDto');
const { bodyObject, profileFields, respondError } = require('../utils/validation');
router.use(authenticate);
router.get('/', async (req, res) => {
  try { res.set('Cache-Control', 'no-store').json({ ...userDto(req.user, true), hubs: await getUserHubs(req.user) }); }
  catch { res.status(503).json({ error: 'Membership check unavailable' }); }
});
router.patch('/', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user._id, { $set: profileFields(req.body) }, { new: true, runValidators: true });
    res.json(userDto(user, true));
  } catch (err) { respondError(res, err, 'Failed to save profile'); }
});
router.post('/assignment/retry', async (req, res) => {
  try {
    if (Object.keys(bodyObject(req.body)).length) return res.status(400).json({ error: 'Assignment retry accepts an empty object only' });
    const result = await tryAssignMembership(req.user);
    res.json({ ...result, user: userDto(result.user, true), token: generateToken(result.user) });
  } catch (err) { respondError(res, err, 'Assignment retry unavailable'); }
});
module.exports = router;
