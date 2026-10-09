import { Router } from 'express';
import { body, param } from 'express-validator';
import validate from '../middleware/validate.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import * as c from '../controllers/teacher.controller.js';

const router = Router();
router.use(verifyToken, requireAdmin);

const idRule = param('id').isMongoId().withMessage('Invalid teacher id.');

const sharedRules = [
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Email is invalid.'),
  body('subjects').optional().isArray().withMessage('Subjects must be a list.'),
  body('subjects.*').optional().isString().trim().isLength({ max: 100 }),
  body('qualifications').optional({ checkFalsy: true }).isLength({ max: 500 }),
  body('joiningDate').optional({ checkFalsy: true }).isISO8601().withMessage('Joining date is invalid.').toDate(),
  body('status').optional().isIn(['active', 'inactive']),
  body('notes').optional({ checkFalsy: true }).isLength({ max: 1000 }),
];

const createRules = [
  body('fullName').trim().notEmpty().withMessage('Full name is required.').isLength({ max: 150 }),
  body('phone').trim().notEmpty().withMessage('Phone number is required.').isLength({ max: 30 }),
  ...sharedRules,
];

const updateRules = [
  body('fullName').optional().trim().notEmpty().withMessage('Full name cannot be empty.'),
  body('phone').optional().trim().notEmpty().withMessage('Phone cannot be empty.'),
  ...sharedRules,
];

router.get('/', c.listTeachers);
router.get('/:id', idRule, validate, c.getTeacher);
router.post('/', createRules, validate, c.createTeacher);
router.put('/:id', [idRule, ...updateRules], validate, c.updateTeacher);
router.delete('/:id', idRule, validate, c.deleteTeacher);

export default router;
