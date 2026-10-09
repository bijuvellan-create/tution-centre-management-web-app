import mongoose from 'mongoose';
import Fee from '../models/Fee.js';
import Payment from '../models/Payment.js';
import { todayCalendarString, formatCalendarDate } from '../utils/date.js';

/** Computes payment status for a fee from its total and the amount paid. */
export function feeStatus(fee, paidPaise) {
  if (fee.isCancelled) return 'cancelled';
  if (paidPaise >= fee.amountPaise) return 'paid';
  if (paidPaise > 0) return 'partial';
  return 'unpaid';
}

export function isOverdue(fee, paidPaise, todayStr = todayCalendarString()) {
  if (fee.isCancelled || !fee.dueDate) return false;
  return paidPaise < fee.amountPaise && formatCalendarDate(fee.dueDate) < todayStr;
}

/**
 * Given a list of plain fee objects, returns them with
 * paidPaise, balancePaise, status and overdue added, using ONE query.
 */
export async function attachBalances(fees) {
  const plain = fees.map((f) => (typeof f.toObject === 'function' ? f.toObject() : f));
  const ids = plain.map((f) => f._id);
  if (ids.length === 0) return [];

  const grouped = await Payment.aggregate([
    { $match: { fee: { $in: ids } } },
    { $group: { _id: '$fee', paid: { $sum: '$amountPaise' } } },
  ]);
  const paidMap = new Map(grouped.map((g) => [String(g._id), g.paid]));

  const today = todayCalendarString();
  return plain.map((fee) => {
    const paidPaise = paidMap.get(String(fee._id)) || 0;
    const balancePaise = Math.max(0, fee.amountPaise - paidPaise);
    return {
      ...fee,
      paidPaise,
      balancePaise,
      status: feeStatus(fee, paidPaise),
      overdue: isOverdue(fee, paidPaise, today),
    };
  });
}

/** Paid amount for a single fee. */
export async function paidForFee(feeId) {
  const result = await Payment.aggregate([
    { $match: { fee: new mongoose.Types.ObjectId(feeId) } },
    { $group: { _id: null, paid: { $sum: '$amountPaise' } } },
  ]);
  return result[0]?.paid || 0;
}

/** Total outstanding balance across all active, non-cancelled fees. */
export async function totalOutstanding() {
  const result = await Fee.aggregate([
    { $match: { isCancelled: false } },
    { $lookup: { from: 'payments', localField: '_id', foreignField: 'fee', as: 'payments' } },
    {
      $group: {
        _id: null,
        due: { $sum: '$amountPaise' },
        paid: { $sum: { $sum: '$payments.amountPaise' } },
      },
    },
    { $project: { outstanding: { $max: [0, { $subtract: ['$due', '$paid'] }] } } },
  ]);
  return result[0]?.outstanding || 0;
}

export { Fee };
