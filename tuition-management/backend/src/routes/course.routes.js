import { Router } from 'express';
import { body, param } from 'express-validator';
import validate from '../middleware/validate.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import * as c from '../controllers/course.controller.js';

const router = Router();
router.use(verifyToken, requireAdmin);

const idRule = param('id').isMongoId().withMessage('Invalid course id.');

const sharedRules = [
  body('subject').optional({ checkFalsy: true }).isLength({ max: 100 }),
  body('grade').optional({ checkFalsy: true }).isLength({ max: 50 }),
  body('description').optional({ checkFalsy: true }).isLength({ max: 1000 }),
  body('durationMonths').optional().isInt({ min: 0, max: 120 }).withMessage('Duration must be 0-120 months.'),
  body('standardFeePaise').optional().isInt({ min: 0 }).withMessage('Fee must be 0 or more.'),
  body('status').optional().isIn(['active', 'inactive']),
];

const createRules = [
  body('name').trim().notEmpty().withMessage('Course name is required.').isLength({ max: 150 }),
  ...sharedRules,
];
const updateRules = [
  body('name').optional().trim().notEmpty().withMessage('Course name cannot be empty.'),
  ...sharedRules,
];

router.get('/', c.listCourses);
router.get('/:id', idRule, validate, c.getCourse);
router.post('/', createRules, validate, c.createCourse);
router.put('/:id', [idRule, ...updateRules], validate, c.updateCourse);
router.patch('/:id/deactivate', idRule, validate, c.deactivateCourse);
router.patch('/:id/activate', idRule, validate, c.activateCourse);
router.delete('/:id', idRule, validate, c.deleteCourse);

export default router;
