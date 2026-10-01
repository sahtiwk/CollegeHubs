const express = require('express');
const { randomBytes } = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { generateToken } = require('../config/auth');
const { emailDomain, normalizeDomain } = require('../config/collegeRegistry');
const { tryAssignMembership } = require('../services/hubProvisioning');
const { userDto } = require('../utils/userDto');
const { bodyObject, text, emailAddress, respondError } = require('../utils/validation');
const router = express.Router();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

router.post('/auth', async (req, res) => {
  try {
    const credential = text(bodyObject(req.body).credential, 'Google ID token', 16384, true);
    if (!GOOGLE_CLIENT_ID) return res.status(503).json({ error: 'Google sign-in is not configured' });
    let info;
    try {
      const client = new OAuth2Client(GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
      info = ticket.getPayload();
    } catch {
      return res.status(401).json({ error: 'Google identity could not be verified. Please try again.' });
    }
    if (!info || !['accounts.google.com', 'https://accounts.google.com'].includes(info.iss) ||
        info.aud !== GOOGLE_CLIENT_ID || info.email_verified !== true ||
        typeof info.sub !== 'string' || !info.sub || !Number.isFinite(info.exp) || info.exp * 1000 <= Date.now()) {
      return res.status(401).json({ error: 'Invalid Google identity' });
    }
    const email = emailAddress(info.email);
    const domain = emailDomain(email);
    // Google is authoritative for Gmail and a matching hosted Workspace domain.
    // Third-party Google-account emails can have stale email_verified evidence.
    const trustedEmail = domain === 'gmail.com' || (typeof info.hd === 'string' && normalizeDomain(info.hd) === domain);
    let user = await User.findOne({ googleSubject: info.sub }).select('+googleSubject +emailVerifiedAt');
    if (user && user.email !== email) return res.status(409).json({ error: 'Google email changed. Account transfer requires review.' });
    if (!user) {
      if (await User.findOne({ email })) return res.status(409).json({ error: 'An account with this email exists. Sign in with its existing method.' });
      const prefix = email.split('@')[0].replace(/[^a-z0-9_.-]/g, '_').slice(0, 30) || 'user';
      user = await User.create({ googleSubject: info.sub, username: `${prefix}_${randomBytes(6).toString('hex')}`, email,
        emailVerifiedAt: trustedEmail ? new Date() : null });
    } else {
      user.emailVerifiedAt = trustedEmail ? new Date() : null;
      if (user.hubId && user.membershipStatus === 'active' && user.membershipVerified !== trustedEmail) {
        user.membershipVerified = trustedEmail;
        user.verificationMethod = trustedEmail ? 'google' : 'domain-claim';
        user.membershipVersion += 1;
      }
      await user.save();
    }
    const result = await tryAssignMembership(user);
    res.json({ token: generateToken(result.user), user: userDto(result.user, true), assignment: result.assignment });
  } catch (err) { respondError(res, err, 'Server error during Google authentication'); }
});
module.exports = router;
