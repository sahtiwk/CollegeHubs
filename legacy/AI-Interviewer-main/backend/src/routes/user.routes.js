const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  getProfile,
  updateProfile,
  changePassword,
  getDashboard,
} = require('../controllers/user.controller');

router.use(protect); // all user routes are protected

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);
router.get('/dashboard', getDashboard);

module.exports = router;
