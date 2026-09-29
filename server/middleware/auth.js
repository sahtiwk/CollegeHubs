const { verifyToken } = require('../config/auth');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const token = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization || '')?.[1];

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(err.name)) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    res.status(500).json({ error: 'Authentication error' });
  }
};

module.exports = { authenticate };
