import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';
import Batch from '../models/Batch.js';
import Attendance from '../models/Attendance.js';
import Payment from '../models/Payment.js';
import { parseCalendarDate, todayCalendarString, formatCalendarDate } from '../utils/date.js';
import { escapeRegex } from '../utils/pagination.js';
import { toCsv, sendCsv } from '../utils/csv.js';
import { totalOutstanding } from '../services/fee.service.js';
import { paiseToRupees } from '../utils/money.js';

function monthRange() {
  const today = todayCalendarString();
  const [year, month] = today.split('-');
  const lastDay = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
  return {
    from: parseCalendarDate(`${year}-${month}-01`),
    to: parseCalendarDate(`${year}-${month}-${String(lastDay).padStart(2, '0')}`),
  };
}

function endOfDay(date) {
  return new Date(date.getTime() + 86399999);
}

function wantsCsv(req) {
  return String(req.query.format || '').toLowerCase() === 'csv';
}

/** GET /api/reports/students */
export const studentsReport = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.batch) filter.batch = req.query.batch;
  if (req.query.course) filter.courses = req.query.course;
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search.trim()), 'i');
    filter.$or = [{ fullName: rx }, { studentId: rx }, { guardianPhone: rx }];
  }

  const students = await Student.find(filter)
    .sort({ createdAt: -1 })
    .populate('batch', 'name')
    .populate('courses', 'name')
    .lean();

  const rows = students.map((s) => ({
    studentId: s.studentId,
    fullName: s.fullName,
    guardianName: s.guardianName,
    guardianPhone: s.guardianPhone,
    batch: s.batch?.name || '',
    courses: (s.courses || []).map((c) => c.name).join('; '),
    monthlyFee: paiseToRupees(s.monthlyFeePaise || 0).toFixed(2),
    status: s.status,
    admissionDate: formatCalendarDate(s.admissionDate) || '',
  }));

  if (wantsCsv(req)) {
    return sendCsv(
      res,
      'students-report.csv',
      toCsv(rows, [
        { label: 'Student ID', value: (r) => r.studentId },
        { label: 'Full Name', value: (r) => r.fullName },
        { label: 'Guardian', value: (r) => r.guardianName },
        { label: 'Guardian Phone', value: (r) => r.guardianPhone },
        { label: 'Batch', value: (r) => r.batch },
        { label: 'Courses', value: (r) => r.courses },
        { label: 'Monthly Fee (INR)', value: (r) => r.monthlyFee },
        { label: 'Status', value: (r) => r.status },
        { label: 'Admission Date', value: (r) => r.admissionDate },
      ])
    );
  }

  res.json({ success: true, data: rows, total: rows.length });
});

/** GET /api/reports/teachers */
export const teachersReport = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search.trim()), 'i');
    filter.$or = [{ fullName: rx }, { teacherId: rx }, { phone: rx }];
  }

  const [teachers, batchCounts] = await Promise.all([
    Teacher.find(filter).sort({ createdAt: -1 }).lean(),
    Batch.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$teacher', count: { $sum: 1 } } },
    ]),
  ]);
  const countMap = new Map(batchCounts.map((b) => [String(b._id), b.count]));

  const rows = teachers.map((t) => ({
    teacherId: t.teacherId,
    fullName: t.fullName,
    phone: t.phone,
    email: t.email || '',
    subjects: (t.subjects || []).join('; '),
    activeBatches: countMap.get(String(t._id)) || 0,
    status: t.status,
    joiningDate: formatCalendarDate(t.joiningDate) || '',
  }));

  if (wantsCsv(req)) {
    return sendCsv(
      res,
      'teachers-report.csv',
      toCsv(rows, [
        { label: 'Teacher ID', value: (r) => r.teacherId },
        { label: 'Full Name', value: (r) => r.fullName },
        { label: 'Phone', value: (r) => r.phone },
        { label: 'Email', value: (r) => r.email },
        { label: 'Subjects', value: (r) => r.subjects },
        { label: 'Active Batches', value: (r) => r.activeBatches },
        { label: 'Status', value: (r) => r.status },
        { label: 'Joining Date', value: (r) => r.joiningDate },
      ])
    );
  }

  res.json({ success: true, data: rows, total: rows.length });
});

/** Aggregations do not auto-cast string ids, so convert them ourselves. */
function toOid(value) {
  if (!mongoose.isValidObjectId(value)) {
    throw new ApiError(400, 'Invalid id in filter.');
  }
  return new mongoose.Types.ObjectId(value);
}

/** Builds the attendance match filter, respecting teacher scope. */
async function buildAttendanceMatch(req) {
  const defaults = monthRange();
  const from = req.query.from ? parseCalendarDate(req.query.from) : defaults.from;
  const to = req.query.to ? parseCalendarDate(req.query.to) : defaults.to;
  if (!from || !to) throw new ApiError(400, 'Invalid date range. Use YYYY-MM-DD.');

  const match = { date: { $gte: from, $lte: endOfDay(to) } };

  if (req.user.role === 'teacher') {
    const teacher = await Teacher.findOne({ userId: req.user._id });
    if (!teacher) throw new ApiError(403, 'Your account is not linked to a teacher profile.');
    const batches = await Batch.find({ teacher: teacher._id }).select('_id');
    const ids = batches.map((b) => b._id);
    if (req.query.batch) {
      if (!ids.some((id) => String(id) === String(req.query.batch))) {
        throw new ApiError(403, 'You can only view attendance for your assigned batches.');
      }
      match.batch = toOid(req.query.batch);
    } else {
      match.batch = { $in: ids };
    }
  } else if (req.query.batch) {
    match.batch = toOid(req.query.batch);
  }

  if (req.query.student) match.student = toOid(req.query.student);
  return { match, from, to };
}

/** GET /api/reports/attendance?mode=daily|monthly|student */
export const attendanceReport = asyncHandler(async (req, res) => {
  const { match, from, to } = await buildAttendanceMatch(req);
  const mode = ['daily', 'monthly', 'student'].includes(req.query.mode)
    ? req.query.mode
    : 'daily';

  const countsStage = {
    present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
    absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
    late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
    excused: { $sum: { $cond: [{ $eq: ['$status', 'excused'] }, 1, 0] } },
    total: { $sum: 1 },
  };

  let groupId;
  if (mode === 'monthly') {
    groupId = { $dateToString: { format: '%Y-%m', date: '$date' } };
  } else if (mode === 'student') {
    groupId = '$student';
  } else {
    groupId = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
  }

  const pipeline = [
    { $match: match },
    { $group: { _id: groupId, ...countsStage } },
    { $sort: { _id: 1 } },
  ];

  let rows = await Attendance.aggregate(pipeline);

  if (mode === 'student') {
    const students = await Student.find({ _id: { $in: rows.map((r) => r._id) } })
      .select('studentId fullName')
      .lean();
    const map = new Map(students.map((s) => [String(s._id), s]));
    rows = rows.map((r) => ({
      studentId: map.get(String(r._id))?.studentId || '',
      fullName: map.get(String(r._id))?.fullName || 'Unknown',
      ...counts(r),
      attendanceRate: rate(r),
    }));
  } else {
    rows = rows.map((r) => ({ period: r._id, ...counts(r), attendanceRate: rate(r) }));
  }

  // Overall summary across the whole range.
  const summaryAgg = await Attendance.aggregate([{ $match: match }, { $group: { _id: null, ...countsStage } }]);
  const summary = summaryAgg[0] || { present: 0, absent: 0, late: 0, excused: 0, total: 0 };

  if (wantsCsv(req)) {
    const csvRows = rows;
    const first = csvRows[0] || {};
    const columns = Object.keys(first).map((key) => ({
      label: key,
      value: (r) => r[key],
    }));
    return sendCsv(res, `attendance-${mode}-report.csv`, toCsv(csvRows, columns));
  }

  res.json({
    success: true,
    mode,
    range: { from: formatCalendarDate(from), to: formatCalendarDate(to) },
    summary: { ...summary, attendanceRate: rate(summary) },
    data: rows,
  });
});

function counts(row) {
  return {
    present: row.present,
    absent: row.absent,
    late: row.late,
    excused: row.excused,
    total: row.total,
  };
}

/** Attended = present + late. Rounded to 2 decimals. */
function rate(row) {
  const total = row.total || 0;
  if (total === 0) return 0;
  return Math.round(((row.present + row.late) / total) * 10000) / 100;
}

/** GET /api/reports/fees */
export const feesReport = asyncHandler(async (req, res) => {
  const defaults = monthRange();
  const from = req.query.from ? parseCalendarDate(req.query.from) : defaults.from;
  const to = req.query.to ? parseCalendarDate(req.query.to) : defaults.to;
  if (!from || !to) throw new ApiError(400, 'Invalid date range. Use YYYY-MM-DD.');

  const match = { paymentDate: { $gte: from, $lte: endOfDay(to) } };
  if (req.query.student) match.student = req.query.student;

  const [byMethod, payments, outstanding] = await Promise.all([
    Payment.aggregate([
      { $match: match },
      { $group: { _id: '$method', totalPaise: { $sum: '$amountPaise' }, count: { $sum: 1 } } },
      { $sort: { totalPaise: -1 } },
    ]),
    Payment.find(match)
      .sort({ paymentDate: -1 })
      .populate('student', 'studentId fullName')
      .populate('fee', 'title')
      .lean(),
    totalOutstanding(),
  ]);

  const totalCollectedPaise = byMethod.reduce((sum, m) => sum + m.totalPaise, 0);

  const rows = payments.map((p) => ({
    receiptNumber: p.receiptNumber,
    paymentDate: formatCalendarDate(p.paymentDate),
    studentId: p.student?.studentId || '',
    studentName: p.student?.fullName || '',
    feeTitle: p.fee?.title || '',
    amount: paiseToRupees(p.amountPaise).toFixed(2),
    method: p.method,
    reference: p.reference || '',
  }));

  if (wantsCsv(req)) {
    return sendCsv(
      res,
      'fees-collection-report.csv',
      toCsv(rows, [
        { label: 'Receipt No', value: (r) => r.receiptNumber },
        { label: 'Date', value: (r) => r.paymentDate },
        { label: 'Student ID', value: (r) => r.studentId },
        { label: 'Student', value: (r) => r.studentName },
        { label: 'Fee', value: (r) => r.feeTitle },
        { label: 'Amount (INR)', value: (r) => r.amount },
        { label: 'Method', value: (r) => r.method },
        { label: 'Reference', value: (r) => r.reference },
      ])
    );
  }

  res.json({
    success: true,
    range: { from: formatCalendarDate(from), to: formatCalendarDate(to) },
    summary: {
      totalCollectedPaise,
      totalOutstandingPaise: outstanding,
      byMethod: byMethod.map((m) => ({
        method: m._id,
        totalPaise: m.totalPaise,
        count: m.count,
      })),
      paymentCount: payments.length,
    },
    data: rows,
  });
});
