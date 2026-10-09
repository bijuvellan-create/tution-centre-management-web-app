import { Router } from 'express';
import { body, param } from 'express-validator';
import validate from '../middleware/validate.js';
import { verifyToken, authorize } from '../middleware/auth.js';
import * as c from '../controllers/attendance.controller.js';

const router = Router();
// Both admins and teachers may manage attendance (teacher scope is enforced in the controller).
router.use(verifyToken, authorize('admin', 'teacher'));

router.get('/', c.listAttendance);

router.post(
  '/',
  [
    body('batch').isMongoId().withMessage('A valid batch is required.'),
    body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be YYYY-MM-DD.'),
    body('records').isArray({ min: 1 }).withMessage('At least one record is required.'),
    body('records.*.student').isMongoId().withMessage('Invalid student id.'),
    body('records.*.status').isIn(['present', 'absent', 'late', 'excused']),
  ],
  validate,
  c.saveAttendance
);

router.put(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid attendance id.'),
    body('status').optional().isIn(['present', 'absent', 'late', 'excused']),
    body('notes').optional({ checkFalsy: true }).isLength({ max: 500 }),
  ],
  validate,
  c.updateAttendance
);

export default router;
