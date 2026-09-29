const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireTenant, scopedFilter } = require('../services/hubAccess');
const { authenticate } = require('../middleware/auth');
const { userDto } = require('../utils/userDto');
const { profileFields, respondError } = require('../utils/validation');

router.put('/onboarding', authenticate, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user._id,
      { $set: profileFields(req.body, true) }, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(userDto(user, true));
  } catch (err) {
    respondError(res, err, 'Failed to save onboarding');
  }
});

router.get('/leaderboard', authenticate, requireTenant, async (req, res) => {
  try {
    const users = await User.find(scopedFilter(req.hub, { membershipStatus: 'active' }), 'username fullName profilePicture auraPoints rankTitle college')
      .sort({ auraPoints: -1 }).limit(50);
    res.json(users.map(user => userDto(user)));
  } catch (err) {
    respondError(res, err, 'Failed to fetch leaderboard');
  }
});

router.get('/:username', authenticate, requireTenant, async (req, res) => {
  try {
    const user = await User.findOne(scopedFilter(req.hub, { username: req.params.username, membershipStatus: 'active' })).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(userDto(user, String(user._id) === String(req.user._id)));
  } catch (err) {
    respondError(res, err, 'Failed to fetch profile');
  }
});

// Legacy provider refresh is deliberately unavailable (no provider call or score write).
router.post('/:username/refresh', (req, res) => {
  res.status(410).json({ error: 'External stats refresh is disabled' });
});

router.put('/:username', authenticate, async (req, res) => {
  if (req.params.username !== req.user.username) return res.status(403).json({ error: 'You can only update your own profile' });
  try {
    const user = await User.findByIdAndUpdate(req.user._id,
      { $set: profileFields(req.body) }, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(userDto(user, true));
  } catch (err) {
    respondError(res, err, 'Failed to update profile');
  }
});

module.exports = router;
