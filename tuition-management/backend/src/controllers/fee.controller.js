import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import Fee from '../models/Fee.js';
import Student from '../models/Student.js';
import Course from '../models/Course.js';
import Batch from '../models/Batch.js';
import { pick } from '../utils/pick.js';
import { getPagination, paginationMeta } from '../utils/pagination.js';
import { parseCalendarDate, todayCalendarString } from '../utils/date.js';
import { recordAudit } from '../services/audit.service.js';
import { attachBalances } from '../services/fee.service.js';

const EDITABLE_FIELDS = ['course', 'batch', 'title', 'periodLabel', 'amountPaise', 'dueDate', 'notes'];

function toObjectId(value) {
  try {
    return new mongoose.Types.ObjectId(value);
  } catch {
    return null;
  }
}

/**
 * GET /api/fees
 * Uses an aggregation so payment status can be filtered and paginated
 * entirely on the server (totals are never trusted from the client).
 */
export const listFees = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);

  const match = {};
  if (req.query.student) match.student = toObjectId(req.query.student);
  if (req.query.batch) match.batch = toObjectId(req.query.batch);
  if (req.query.periodLabel) match.periodLabel = req.query.periodLabel;

  if (req.query.from || req.query.to) {
    match.dueDate = {};
    if (req.query.from) {
      const from = parseCalendarDate(req.query.from);
      if (!from) throw new ApiError(400, 'Invalid "from" date.');
      match.dueDate.$gte = from;
    }
    if (req.query.to) {
      const to = parseCalendarDate(req.query.to);
      if (!to) throw new ApiError(400, 'Invalid "to" date.');
      match.dueDate.$lte = to;
    }
  }

  const today = new Date(todayCalendarString());

  const base = [
    { $match: match },
    { $lookup: { from: 'payments', localField: '_id', foreignField: 'fee', as: 'payments' } },
    { $addFields: { paidPaise: { $sum: '$payments.amountPaise' } } },
    {
      $addFields: {
        balancePaise: { $max: [0, { $subtract: ['$amountPaise', '$paidPaise'] }] },
      },
    },
    {
      $addFields: {
        status: {
          $switch: {
            branches: [
              { case: { $eq: ['$isCancelled', true] }, then: 'cancelled' },
              { case: { $gte: ['$paidPaise', '$amountPaise'] }, then: 'paid' },
              { case: { $gt: ['$paidPaise', 0] }, then: 'partial' },
            ],
            default: 'unpaid',
          },
        },
        overdue: {
          $and: [
            { $ne: ['$dueDate', null] },
            { $lt: ['$dueDate', today] },
            { $lt: ['$paidPaise', '$amountPaise'] },
            { $eq: ['$isCancelled', false] },
          ],
        },
      },
    },
  ];

  const filters = [];
  if (req.query.status) filters.push({ $match: { status: req.query.status } });
  if (req.query.overdue === 'true') filters.push({ $match: { overdue: true } });

  const countResult = await Fee.aggregate([
    ...base,
    ...filters,
    { $count: 'total' },
  ]);
  const total = countResult[0]?.total || 0;

  const rows = await Fee.aggregate([
    ...base,
    ...filters,
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    { $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 'student' } },
    { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'courses', localField: 'course', foreignField: '_id', as: 'course' } },
    { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'batches', localField: 'batch', foreignField: '_id', as: 'batch' } },
    { $unwind: { path: '$batch', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        payments: 0,
        'student.passwordHash': 0,
        'student.notes': 0,
        'student.address': 0,
      },
    },
  ]);

  res.json({ success: true, data: rows, meta: paginationMeta({ page, limit, total }) });
});

/** GET /api/fees/:id */
export const getFee = asyncHandler(async (req, res) => {
  const fee = await Fee.findById(req.params.id)
    .populate('student', 'studentId fullName guardianName guardianPhone')
    .populate('course', 'name subject')
    .populate('batch', 'name');
  if (!fee) throw new ApiError(404, 'Fee record not found.');

  const [withBalance] = await attachBalances([fee]);
  res.json({ success: true, data: withBalance });
});

/** POST /api/fees */
export const createFee = asyncHandler(async (req, res) => {
  const payload = pick(req.body, EDITABLE_FIELDS);
  const student = await Student.findById(req.body.student);
  if (!student) throw new ApiError(400, 'Student not found.');

  if (payload.course) {
    const exists = await Course.exists({ _id: payload.course });
    if (!exists) throw new ApiError(400, 'Course not found.');
  }
  if (payload.batch) {
    const exists = await Batch.exists({ _id: payload.batch });
    if (!exists) throw new ApiError(400, 'Batch not found.');
  }

  const fee = new Fee({ ...payload, student: student._id, createdBy: req.user._id });
  await fee.save();

  await recordAudit({
    req,
    action: 'fee.create',
    entityType: 'Fee',
    entityId: fee._id,
    description: `Created fee "${fee.title}" for ${student.studentId}`,
  });

  const [withBalance] = await attachBalances([fee]);
  res.status(201).json({ success: true, message: 'Fee created successfully.', data: withBalance });
});

/** PUT /api/fees/:id — amount can only change if no payments exist yet. */
export const updateFee = asyncHandler(async (req, res) => {
  const fee = await Fee.findById(req.params.id);
  if (!fee) throw new ApiError(404, 'Fee record not found.');

  const payload = pick(req.body, EDITABLE_FIELDS);
  if (payload.amountPaise !== undefined && payload.amountPaise !== fee.amountPaise) {
    const { paidForFee } = await import('../services/fee.service.js');
    const paid = await paidForFee(fee._id);
    if (paid > 0) {
      throw new ApiError(409, 'The amount cannot be changed after payments have been recorded.');
    }
  }

  Object.assign(fee, payload);
  await fee.save();

  await recordAudit({
    req,
    action: 'fee.update',
    entityType: 'Fee',
    entityId: fee._id,
    description: `Updated fee "${fee.title}"`,
  });

  const [withBalance] = await attachBalances([fee]);
  res.json({ success: true, message: 'Fee updated successfully.', data: withBalance });
});

/** PATCH /api/fees/:id/cancel — invoices are cancelled, never deleted. */
export const cancelFee = asyncHandler(async (req, res) => {
  const fee = await Fee.findById(req.params.id);
  if (!fee) throw new ApiError(404, 'Fee record not found.');
  if (fee.isCancelled) throw new ApiError(409, 'This fee is already cancelled.');

  const { paidForFee } = await import('../services/fee.service.js');
  const paid = await paidForFee(fee._id);
  if (paid > 0) {
    throw new ApiError(409, 'A fee with recorded payments cannot be cancelled.');
  }

  fee.isCancelled = true;
  await fee.save();

  await recordAudit({
    req,
    action: 'fee.cancel',
    entityType: 'Fee',
    entityId: fee._id,
    description: `Cancelled fee "${fee.title}"`,
  });

  res.json({ success: true, message: 'Fee cancelled.', data: fee });
});
