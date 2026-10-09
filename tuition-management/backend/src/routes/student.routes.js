import { Router } from 'express';
import { body, param } from 'express-validator';
import validate from '../middleware/validate.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import * as c from '../controllers/student.controller.js';

const router = Router();
router.use(verifyToken, requireAdmin);

const idRule = param('id').isMongoId().withMessage('Invalid student id.');

const sharedRules = [
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Email is invalid.'),
  body('gender').optional({ checkFalsy: true }).isIn(['male', 'female', 'other', 'unspecified']),
  body('dateOfBirth').optional({ checkFalsy: true }).isISO8601().withMessage('Date of birth is invalid.').toDate(),
  body('admissionDate').optional({ checkFalsy: true }).isISO8601().withMessage('Admission date is invalid.').toDate(),
  body('monthlyFeePaise').optional().isInt({ min: 0 }).withMessage('Monthly fee must be 0 or more.'),
  body('status').optional().isIn(['active', 'inactive']),
  body('courses').optional().isArray().withMessage('Courses must be a list.'),
  body('courses.*').optional().isMongoId().withMessage('Invalid course id.'),
  body('batch').optional({ checkFalsy: true }).isMongoId().withMessage('Invalid batch id.'),
  body('notes').optional({ checkFalsy: true }).isLength({ max: 1000 }),
];

const createRules = [
  body('fullName').trim().notEmpty().withMessage('Full name is required.').isLength({ max: 150 }),
  body('guardianName').trim().notEmpty().withMessage('Guardian name is required.'),
  body('guardianPhone').trim().notEmpty().withMessage('Guardian phone is required.').isLength({ max: 30 }),
  ...sharedRules,
];

const updateRules = [
  body('fullName').optional().trim().notEmpty().withMessage('Full name cannot be empty.').isLength({ max: 150 }),
  body('guardianName').optional().trim().notEmpty().withMessage('Guardian name cannot be empty.'),
  body('guardianPhone').optional().trim().notEmpty().withMessage('Guardian phone cannot be empty.'),
  ...sharedRules,
];

router.get('/', c.listStudents);
router.get('/:id', idRule, validate, c.getStudent);
router.post('/', createRules, validate, c.createStudent);
router.put('/:id', [idRule, ...updateRules], validate, c.updateStudent);
router.delete('/:id', idRule, validate, c.deleteStudent);

export default router;
