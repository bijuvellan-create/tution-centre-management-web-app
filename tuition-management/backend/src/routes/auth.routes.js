import { Router } from 'express';
import { body } from 'express-validator';

import validate from '../middleware/validate.js';
import { verifyToken } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimit.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

router.post(
  '/login',
  loginLimiter,
  [
    body('email').isEmail().withMessage('Please enter a valid email address.').trim(),
    body('password').isString().notEmpty().withMessage('Password is required.'),
  ],
  validate,
  authController.login
);

router.post('/logout', authController.logout);

router.get('/me', verifyToken, authController.me);

router.post(
  '/change-password',
  verifyToken,
  [
    body('currentPassword').isString().notEmpty().withMessage('Current password is required.'),
    body('newPassword')
      .isString()
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long.')
      .matches(/[0-9]/)
      .withMessage('New password must contain at least one number.')
      .matches(/[A-Za-z]/)
      .withMessage('New password must contain at least one letter.'),
  ],
  validate,
  authController.changePassword
);

export default router;
