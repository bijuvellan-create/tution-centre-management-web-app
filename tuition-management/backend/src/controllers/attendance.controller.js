import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import Attendance from '../models/Attendance.js';
import Batch from '../models/Batch.js';
import Teacher from '../models/Teacher.js';
import { parseCalendarDate, formatCalendarDate } from '../utils/date.js';
import { getPagination, paginationMeta } from '../utils/pagination.js';
import { recordAudit } from '../services/audit.service.js';

const VALID_STATUS = ['present', 'absent', 'late', 'excused'];

/**
 * Teachers may only touch batches they are assigned to. Admins can touch all.
 * Throws 403 otherwise.
 */
async function assertBatchAccess(req, batch) {
  if (req.user.role === 'admin') return;
  if (req.user.role !== 'teacher') throw new ApiError(403, 'Not allowed to manage attendance.');

  const teacher = await Teacher.findOne({ userId: req.user._id });
  if (!teacher || String(batch.teacher) !== String(teacher._id)) {
    throw new ApiError(403, 'You can only manage attendance for your assigned batches.');
  }
}

/** GET /api/attendance */
export const listAttendance = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 50 });
  const filter = {};

  if (req.query.batch) filter.batch = req.query.batch;
  if (req.query.student) filter.student = req.query.student;
  if (req.query.status) filter.status = req.query.status;

  const date = req.query.date ? parseCalendarDate(req.query.date) : null;
  if (req.query.date && !date) throw new ApiError(400, 'Invalid date. Use YYYY-MM-DD.');
  if (date) filter.date = date;

  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) {
      const from = parseCalendarDate(req.query.from);
      if (!from) throw new ApiError(400, 'Invalid "from" date. Use YYYY-MM-DD.');
      filter.date.$gte = from;
    }
    if (req.query.to) {
      const to = parseCalendarDate(req.query.to);
      if (!to) throw new ApiError(400, 'Invalid "to" date. Use YYYY-MM-DD.');
      filter.date.$lte = to;
    }
  }

  // Teachers can only see their own batches.
  if (req.user.role === 'teacher') {
    const teacher = await Teacher.findOne({ userId: req.user._id });
    if (!teacher) throw new ApiError(403, 'Your account is not linked to a teacher profile.');
    const batches = await Batch.find({ teacher: teacher._id }).select('_id');
    const ids = batches.map((b) => b._id);
    filter.batch = filter.batch && ids.some((i) => String(i) === String(filter.batch))
      ? filter.batch
      : { $in: ids };
  }

  const [items, total] = await Promise.all([
    Attendance.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('student', 'studentId fullName')
      .populate('batch', 'name')
      .populate('markedBy', 'name'),
    Attendance.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: items.map((a) => ({ ...a.toObject(), date: formatCalendarDate(a.date) })),
    meta: paginationMeta({ page, limit, total }),
  });
});

/**
 * POST /api/attendance
 * Saves attendance for a whole batch on one date.
 * Body: { batch, date, records: [{ student, status, notes }] }
 * Uses an upsert on the unique {student,batch,date} index so re-saving the
 * same day updates the existing records instead of creating duplicates.
 */
export const saveAttendance = asyncHandler(async (req, res) => {
  const { batch: batchId, date: rawDate, records } = req.body;

  const date = parseCalendarDate(rawDate);
  if (!date) throw new ApiError(400, 'A valid date (YYYY-MM-DD) is required.');

  const batch = await Batch.findById(batchId);
  if (!batch) throw new ApiError(404, 'Batch not found.');
  await assertBatchAccess(req, batch);

  if (!Array.isArray(records) || records.length === 0) {
    throw new ApiError(400, 'At least one attendance record is required.');
  }

  const enrolled = new Set(batch.students.map((id) => String(id)));

  const operations = records.map((record) => {
    if (!enrolled.has(String(record.student))) {
      throw new ApiError(400, 'One or more students are not enrolled in this batch.');
    }
    if (!VALID_STATUS.includes(record.status)) {
      throw new ApiError(400, `Invalid attendance status: ${record.status}`);
    }
    return {
      updateOne: {
        filter: { student: record.student, batch: batch._id, date },
        update: {
          $set: {
            status: record.status,
            notes: record.notes || undefined,
            markedBy: req.user._id,
          },
        },
        upsert: true,
      },
    };
  });

  const result = await Attendance.bulkWrite(operations, { ordered: false });

  await recordAudit({
    req,
    action: 'attendance.save',
    entityType: 'Batch',
    entityId: batch._id,
    description: `Saved attendance for ${batch.name} on ${rawDate}`,
  });

  res.json({
    success: true,
    message: 'Attendance saved successfully.',
    data: {
      created: result.upsertedCount,
      updated: result.modifiedCount,
      total: records.length,
    },
  });
});

/** PUT /api/attendance/:id — correct a single record. */
export const updateAttendance = asyncHandler(async (req, res) => {
  const attendance = await Attendance.findById(req.params.id);
  if (!attendance) throw new ApiError(404, 'Attendance record not found.');

  const batch = await Batch.findById(attendance.batch);
  await assertBatchAccess(req, batch);

  const { status, notes } = req.body;
  if (status !== undefined) {
    if (!VALID_STATUS.includes(status)) throw new ApiError(400, `Invalid status: ${status}`);
    attendance.status = status;
  }
  if (notes !== undefined) attendance.notes = notes;
  attendance.markedBy = req.user._id;
  await attendance.save();

  await recordAudit({
    req,
    action: 'attendance.update',
    entityType: 'Attendance',
    entityId: attendance._id,
    description: `Corrected attendance to "${attendance.status}"`,
  });

  res.json({ success: true, message: 'Attendance updated.', data: attendance });
});
