import { Router } from 'express';
import { body, param } from 'express-validator';
import validate from '../middleware/validate.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import * as c from '../controllers/batch.controller.js';

const router = Router();
router.use(verifyToken);

const idRule = param('id').isMongoId().withMessage('Invalid batch id.');

const sharedRules = [
  body('teacher').optional({ checkFalsy: true }).isMongoId().withMessage('Invalid teacher id.'),
  body('startDate').optional({ checkFalsy: true }).isISO8601().withMessage('Start date is invalid.').toDate(),
  body('endDate').optional({ checkFalsy: true }).isISO8601().withMessage('End date is invalid.').toDate(),
  body('classDays').optional().isArray().withMessage('Class days must be a list.'),
  body('classDays.*').optional().isIn(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']),
  body('startTime').optional({ checkFalsy: true }).matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Start time must be HH:mm.'),
  body('endTime').optional({ checkFalsy: true }).matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('End time must be HH:mm.'),
  body('capacity').optional().isInt({ min: 1, max: 500 }).withMessage('Capacity must be 1-500.'),
  body('status').optional().isIn(['active', 'inactive']),
];

const createRules = [
  body('name').trim().notEmpty().withMessage('Batch name is required.').isLength({ max: 150 }),
  body('course').isMongoId().withMessage('A valid course is required.'),
  ...sharedRules,
];
const updateRules = [
  body('name').optional().trim().notEmpty().withMessage('Batch name cannot be empty.'),
  body('course').optional().isMongoId().withMessage('Invalid course id.'),
  ...sharedRules,
];

// Read (admin + teacher). Teachers are filtered to their own batches.
router.get('/', c.listBatches);
router.get('/:id', idRule, validate, c.getBatch);

// Writes are admin-only.
router.post('/', requireAdmin, createRules, validate, c.createBatch);
router.put('/:id', requireAdmin, [idRule, ...updateRules], validate, c.updateBatch);
router.patch('/:id/deactivate', requireAdmin, idRule, validate, c.deactivateBatch);
router.patch('/:id/activate', requireAdmin, idRule, validate, c.activateBatch);
router.delete('/:id', requireAdmin, idRule, validate, c.deleteBatch);
router.post(
  '/:id/students',
  requireAdmin,
  [idRule, body('studentId').isMongoId().withMessage('Invalid student id.')],
  validate,
  c.enrollStudent
);
router.delete(
  '/:id/students/:studentId',
  requireAdmin,
  [idRule, param('studentId').isMongoId().withMessage('Invalid student id.')],
  validate,
  c.unenrollStudent
);

export default router;
