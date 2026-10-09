import mongoose from 'mongoose';

export const PAYMENT_METHODS = ['cash', 'upi', 'bank_transfer', 'card', 'cheque', 'other'];

/**
 * A single payment received against a fee. Payments are append-only:
 * they are never edited or deleted, so balances always add up.
 */
const paymentSchema = new mongoose.Schema(
  {
    receiptNumber: { type: String, required: true, unique: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    fee: { type: mongoose.Schema.Types.ObjectId, ref: 'Fee', required: true, index: true },
    amountPaise: { type: Number, required: true, min: 1 },
    paymentDate: { type: Date, default: Date.now, index: true },
    method: { type: String, enum: PAYMENT_METHODS, default: 'cash' },
    reference: { type: String, trim: true, maxlength: 120 },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

paymentSchema.index({ createdAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
