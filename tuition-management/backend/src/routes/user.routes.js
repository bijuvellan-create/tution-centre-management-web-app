import { Router } from 'express';
import { body, param } from 'express-validator';
import validate from '../middleware/validate.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import * as c from '../controllers/user.controller.js';

const router = Router();
router.use(verifyToken, requireAdmin);

const idRule = param('id').isMongoId().withMessage('Invalid user id.');

const passwordRule = body('password')
  .isString()
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters.')
  .matches(/[0-9]/)
  .withMessage('Password must contain a number.')
  .matches(/[A-Za-z]/)
  .withMessage('Password must contain a letter.');

router.get('/', c.listUsers);

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 120 }),
    body('email').isEmail().withMessage('A valid email is required.'),
    passwordRule,
    body('role').isIn(['admin', 'teacher']).withMessage('Role must be admin or teacher.'),
    body('teacherProfile').optional({ checkFalsy: true }).isMongoId(),
  ],
  validate,
  c.createUser
);

router.put(
  '/:id',
  [
    idRule,
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty.'),
    body('role').optional().isIn(['admin', 'teacher']),
    body('isActive').optional().isBoolean(),
    body('teacherProfile').optional({ checkFalsy: true }).isMongoId(),
  ],
  validate,
  c.updateUser
);

router.put(
  '/:id/password',
  [
    idRule,
    body('newPassword')
      .isString()
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters.')
      .matches(/[0-9]/)
      .withMessage('Password must contain a number.')
      .matches(/[A-Za-z]/)
      .withMessage('Password must contain a letter.'),
  ],
  validate,
  c.resetUserPassword
);

router.delete('/:id', idRule, validate, c.deleteUser);

export default router;
