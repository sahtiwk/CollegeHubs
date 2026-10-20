const { verifyToken } = require('../config/auth');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const token = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization || '')?.[1];

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.sub).select('-password');

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    await require('../services/coreSessionService').assertAccess(decoded, user);
    const hubId = require('../services/membershipPolicy').hasMembershipAuthority(user) ? String(user.hubId) : null;
    if (decoded.membershipVersion !== (user.membershipVersion || 0) || decoded.hubId !== hubId) {
      return res.status(401).json({ error: 'Membership changed. Please sign in again.' });
    }
    req.auth = decoded;
    req.user = user;
    next();
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: err.message, code: err.code });
    if (['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(err.name)) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    res.status(500).json({ error: 'Authentication error' });
  }
};

module.exports = { authenticate };
