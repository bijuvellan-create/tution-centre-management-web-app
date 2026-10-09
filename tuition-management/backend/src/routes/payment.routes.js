import { Router } from 'express';
import { body, param } from 'express-validator';
import validate from '../middleware/validate.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import { PAYMENT_METHODS } from '../models/Payment.js';
import * as c from '../controllers/payment.controller.js';

const router = Router();
router.use(verifyToken, requireAdmin);

router.get('/', c.listPayments);

router.post(
  '/',
  [
    body('fee').isMongoId().withMessage('A valid fee record is required.'),
    body('student').optional({ checkFalsy: true }).isMongoId().withMessage('Invalid student id.'),
    body('amountPaise').isInt({ min: 1 }).withMessage('Amount must be a positive whole number of paise.'),
    body('paymentDate').optional({ checkFalsy: true }).isISO8601().withMessage('Payment date is invalid.').toDate(),
    body('method').optional().isIn(PAYMENT_METHODS).withMessage('Invalid payment method.'),
    body('reference').optional({ checkFalsy: true }).isLength({ max: 120 }),
    body('notes').optional({ checkFalsy: true }).isLength({ max: 500 }),
  ],
  validate,
  c.createPayment
);

router.get('/:id/receipt', param('id').isMongoId().withMessage('Invalid payment id.'), validate, c.getReceipt);

export default router;
