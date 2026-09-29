const express = require('express');
const { randomBytes } = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { generateToken } = require('../config/auth');
const { userDto } = require('../utils/userDto');
const { bodyObject, text, emailAddress, respondError } = require('../utils/validation');
const router = express.Router();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

router.post('/auth', async (req, res) => {
  try {
    const accessToken = text(bodyObject(req.body).accessToken, 'Google access token', 8192, true);
    if (!GOOGLE_CLIENT_ID) return res.status(503).json({ error: 'Google sign-in is not configured' });
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    let info;
    try {
      info = await client.getTokenInfo(accessToken);
    } catch (err) {
      const invalid = [400, 401, 403].includes(err.response?.status);
      return res.status(invalid ? 401 : 503).json({ error: invalid ? 'Invalid Google token' : 'Google sign-in unavailable; try again' });
    }
    if (info.aud !== GOOGLE_CLIENT_ID || info.email_verified !== true ||
        typeof info.sub !== 'string' || !info.sub || !Number.isFinite(info.expiry_date) || info.expiry_date <= Date.now()) {
      return res.status(401).json({ error: 'Invalid Google identity' });
    }
    const email = emailAddress(info.email);
    let user = await User.findOne({ googleId: info.sub });
    if (!user) {
      // Do not silently link a password account based on matching email.
      if (await User.findOne({ email })) {
        return res.status(409).json({ error: 'An account with this email exists. Sign in with its existing method.' });
      }
      const suffix = randomBytes(6).toString('hex');
      const prefix = email.split('@')[0].replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 30) || 'user';
      user = await User.create({
        googleId: info.sub, username: `${prefix}_${suffix}`, email,
        // Schema still requires a password; it is random, never returned, and bcrypt hashed.
        password: randomBytes(32).toString('hex'),
      });
    }
    res.json({ token: generateToken(user), user: userDto(user, true) });
  } catch (err) {
    respondError(res, err, 'Server error during Google authentication');
  }
});

module.exports = router;
