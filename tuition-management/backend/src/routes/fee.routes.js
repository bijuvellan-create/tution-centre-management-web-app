import { Router } from 'express';
import { body, param } from 'express-validator';
import validate from '../middleware/validate.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import * as c from '../controllers/fee.controller.js';

const router = Router();
router.use(verifyToken, requireAdmin);

const idRule = param('id').isMongoId().withMessage('Invalid fee id.');

const sharedRules = [
  body('course').optional({ checkFalsy: true }).isMongoId().withMessage('Invalid course id.'),
  body('batch').optional({ checkFalsy: true }).isMongoId().withMessage('Invalid batch id.'),
  body('periodLabel').optional({ checkFalsy: true }).matches(/^\d{4}-\d{2}$/).withMessage('Period must be YYYY-MM.'),
  body('amountPaise').optional().isInt({ min: 1 }).withMessage('Amount must be greater than zero.'),
  body('dueDate').optional({ checkFalsy: true }).isISO8601().withMessage('Due date is invalid.').toDate(),
  body('notes').optional({ checkFalsy: true }).isLength({ max: 500 }),
];

const createRules = [
  body('student').isMongoId().withMessage('A valid student is required.'),
  body('title').trim().notEmpty().withMessage('Title is required.').isLength({ max: 200 }),
  body('amountPaise').isInt({ min: 1 }).withMessage('Amount must be greater than zero.'),
  ...sharedRules,
];

const updateRules = [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty.'),
  ...sharedRules,
];

router.get('/', c.listFees);
router.get('/:id', idRule, validate, c.getFee);
router.post('/', createRules, validate, c.createFee);
router.put('/:id', [idRule, ...updateRules], validate, c.updateFee);
router.patch('/:id/cancel', idRule, validate, c.cancelFee);

export default router;
