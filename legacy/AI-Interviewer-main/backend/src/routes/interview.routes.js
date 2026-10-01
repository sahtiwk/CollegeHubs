const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const {
  createInterview,
  generateQuestions,
  getMyInterviews,
  getInterviewById,
  deleteInterview,
} = require('../controllers/interview.controller');

const createValidation = [
  body('jobTitle').trim().notEmpty().withMessage('Job title is required'),
  body('jobDescription').trim().notEmpty().withMessage('Job description is required')
    .isLength({ min: 50 }).withMessage('Job description must be at least 50 characters'),
  body('experienceLevel')
    .optional()
    .isIn(['entry', 'mid', 'senior', 'lead', 'executive'])
    .withMessage('Invalid experience level'),
  body('numberOfQuestions')
    .optional()
    .isInt({ min: 3, max: 20 })
    .withMessage('Number of questions must be between 3 and 20'),
];

router.use(protect);

router.get('/', getMyInterviews);
router.post('/', createValidation, validate, createInterview);
router.get('/:id', getInterviewById);
router.post('/:id/generate', generateQuestions);
router.delete('/:id', deleteInterview);

module.exports = router;
