import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import Payment from '../models/Payment.js';
import Fee from '../models/Fee.js';
import Student from '../models/Student.js';
import { nextReceiptNumber } from '../utils/sequence.js';
import { pick } from '../utils/pick.js';
import { getPagination, paginationMeta } from '../utils/pagination.js';
import { parseCalendarDate } from '../utils/date.js';
import { recordAudit } from '../services/audit.service.js';
import { paidForFee } from '../services/fee.service.js';
import { env } from '../config/env.js';

const EDITABLE_FIELDS = ['amountPaise', 'paymentDate', 'method', 'reference', 'notes'];

/** GET /api/payments */
export const listPayments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 25 });
  const filter = {};
  if (req.query.student) filter.student = req.query.student;
  if (req.query.fee) filter.fee = req.query.fee;
  if (req.query.method) filter.method = req.query.method;

  if (req.query.from || req.query.to) {
    filter.paymentDate = {};
    if (req.query.from) {
      const from = parseCalendarDate(req.query.from);
      if (!from) throw new ApiError(400, 'Invalid "from" date.');
      filter.paymentDate.$gte = from;
    }
    if (req.query.to) {
      const to = parseCalendarDate(req.query.to);
      if (!to) throw new ApiError(400, 'Invalid "to" date.');
      // Include the whole "to" day.
      filter.paymentDate.$lte = new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1);
    }
  }

  const [items, total] = await Promise.all([
    Payment.find(filter)
      .sort({ paymentDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('student', 'studentId fullName')
      .populate('fee', 'title periodLabel amountPaise')
      .populate('recordedBy', 'name'),
    Payment.countDocuments(filter),
  ]);

  res.json({ success: true, data: items, meta: paginationMeta({ page, limit, total }) });
});

/**
 * POST /api/payments
 * The remaining balance is ALWAYS calculated on the server. The client only
 * sends the amount it wants to record.
 */
export const createPayment = asyncHandler(async (req, res) => {
  const payload = pick(req.body, EDITABLE_FIELDS);
  const amountPaise = payload.amountPaise;

  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw new ApiError(400, 'Payment amount must be a positive whole number of paise.');
  }

  const fee = await Fee.findById(req.body.fee);
  if (!fee) throw new ApiError(400, 'Fee record not found.');
  if (fee.isCancelled) throw new ApiError(409, 'Cannot record a payment against a cancelled fee.');

  const studentId = req.body.student || fee.student;
  if (String(studentId) !== String(fee.student)) {
    throw new ApiError(400, 'The payment student does not match the fee record.');
  }
  const student = await Student.findById(fee.student);
  if (!student) throw new ApiError(400, 'Student not found.');

  const alreadyPaid = await paidForFee(fee._id);
  const balance = fee.amountPaise - alreadyPaid;
  if (balance <= 0) throw new ApiError(409, 'This fee is already fully paid.');
  if (amountPaise > balance) {
    throw new ApiError(
      409,
      `Payment exceeds the outstanding balance. Remaining balance is ${(balance / 100).toFixed(2)} INR.`
    );
  }

  const payment = new Payment({
    ...payload,
    student: fee.student,
    fee: fee._id,
    receiptNumber: await nextReceiptNumber(),
    recordedBy: req.user._id,
  });
  await payment.save();

  await recordAudit({
    req,
    action: 'payment.create',
    entityType: 'Payment',
    entityId: payment._id,
    description: `Recorded payment ${payment.receiptNumber} of ${(amountPaise / 100).toFixed(2)} INR`,
  });

  res.status(201).json({
    success: true,
    message: 'Payment recorded successfully.',
    data: payment,
  });
});

/**
 * GET /api/payments/:id/receipt
 * Returns everything needed to render a printable receipt. This is a simple
 * acknowledgement document, not a tax-compliant invoice.
 */
export const getReceipt = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id)
    .populate('student', 'studentId fullName guardianName guardianPhone')
    .populate('fee', 'title periodLabel amountPaise')
    .populate('recordedBy', 'name');
  if (!payment) throw new ApiError(404, 'Payment not found.');

  res.json({
    success: true,
    data: {
      organisation: env.appName,
      receiptNumber: payment.receiptNumber,
      paymentDate: payment.paymentDate,
      amountPaise: payment.amountPaise,
      method: payment.method,
      reference: payment.reference || null,
      notes: payment.notes || null,
      recordedBy: payment.recordedBy?.name || null,
      student: payment.student
        ? {
            studentId: payment.student.studentId,
            fullName: payment.student.fullName,
            guardianName: payment.student.guardianName,
            guardianPhone: payment.student.guardianPhone,
          }
        : null,
      fee: payment.fee
        ? { title: payment.fee.title, periodLabel: payment.fee.periodLabel }
        : null,
      disclaimer: 'This is a payment acknowledgement, not a tax invoice.',
    },
  });
});
