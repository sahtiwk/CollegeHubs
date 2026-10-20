const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { userDto } = require('../utils/userDto');
const { bodyObject, text, emailAddress, passwordValue, respondError, badInput } = require('../utils/validation');
const { tryAssignMembership } = require('../services/hubProvisioning');
const router = express.Router();
router.get('/capabilities', (_req,res)=>res.json({google:require('../services/googleIdentity').capability(),mail:require('../services/verificationMail').capability()}));

router.post('/register', async (req, res) => {
  try {
    const body = bodyObject(req.body);
    const username = text(body.username, 'Username', 50, true).toLowerCase();
    if (!/^[a-zA-Z0-9_.-]{3,50}$/.test(username)) throw badInput('Username must be 3-50 letters, numbers, dots, underscores or hyphens');
    const email = emailAddress(body.email);
    const password = passwordValue(body.password, true);
    if (await User.findOne({ $or: [{ email }, { username }] })) {
      return res.status(409).json({ error: 'Email or username already in use' });
    }
    // Save onboarding identity independently of mail. Request/consume proof is explicit;
    // assignment cannot use an email domain alone. The model retains bcrypt cost 12.
    const user = await User.create({ username, email, password, auraPoints: 0 });
    const result = await tryAssignMembership(user);
    res.status(201).json({ token: await require('../services/coreSessionService').issue(req, res, result.user), user: await userDto(result.user, true), assignment: result.assignment });
  } catch (err) {
    respondError(res, err, 'Server error during registration');
  }
});

router.post('/login', async (req, res) => {
  try {
    const body = bodyObject(req.body);
    const email = emailAddress(body.email);
    const password = passwordValue(body.password);
    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({ token: await require('../services/coreSessionService').issue(req, res, user), user: await userDto(user, true) });
  } catch (err) {
    respondError(res, err, 'Server error during login');
  }
});

module.exports = router;
