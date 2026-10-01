const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  startSession,
  submitAnswer,
  completeSession,
  getMySessions,
  getSessionById,
} = require('../controllers/session.controller');

router.use(protect);

router.get('/', getMySessions);
router.post('/start', startSession);
router.get('/:id', getSessionById);
router.post('/:id/answer', submitAnswer);
router.post('/:id/complete', completeSession);

module.exports = router;
