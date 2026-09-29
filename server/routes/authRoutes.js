const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateToken } = require('../config/auth');
const { userDto } = require('../utils/userDto');
const { bodyObject, text, emailAddress, passwordValue, respondError, badInput } = require('../utils/validation');
const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const body = bodyObject(req.body);
    const username = text(body.username, 'Username', 50, true);
    if (!/^[a-zA-Z0-9_.-]{3,50}$/.test(username)) throw badInput('Username must be 3-50 letters, numbers, dots, underscores or hyphens');
    const email = emailAddress(body.email);
    const password = passwordValue(body.password, true);
    if (await User.findOne({ $or: [{ email }, { username }] })) {
      return res.status(409).json({ error: 'Email or username already in use' });
    }
    // The model save hook retains bcrypt cost 12.
    const user = await User.create({ username, email, password, auraPoints: 0 });
    res.status(201).json({ token: generateToken(user), user: userDto(user, true) });
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
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({ token: generateToken(user), user: userDto(user, true) });
  } catch (err) {
    respondError(res, err, 'Server error during login');
  }
});

module.exports = router;
