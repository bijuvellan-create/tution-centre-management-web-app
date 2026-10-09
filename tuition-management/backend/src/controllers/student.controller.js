import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import Student from '../models/Student.js';
import Batch from '../models/Batch.js';
import Course from '../models/Course.js';
import Attendance from '../models/Attendance.js';
import Payment from '../models/Payment.js';
import { nextStudentId } from '../utils/sequence.js';
import { pick } from '../utils/pick.js';
import { getPagination, paginationMeta, escapeRegex } from '../utils/pagination.js';
import { recordAudit } from '../services/audit.service.js';
import { enrollStudentInBatch, unenrollStudentFromBatch } from '../services/enrollment.service.js';

const EDITABLE_FIELDS = [
  'fullName',
  'dateOfBirth',
  'gender',
  'guardianName',
  'guardianPhone',
  'email',
  'address',
  'admissionDate',
  'courses',
  'batch',
  'monthlyFeePaise',
  'status',
  'notes',
];

function buildFilter(query) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.batch) filter.batch = query.batch;
  if (query.course) filter.courses = query.course;
  if (query.search) {
    const rx = new RegExp(escapeRegex(query.search.trim()), 'i');
    filter.$or = [
      { fullName: rx },
      { studentId: rx },
      { guardianName: rx },
      { guardianPhone: rx },
      { email: rx },
    ];
  }
  return filter;
}

/** GET /api/students */
export const listStudents = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = buildFilter(req.query);

  const [items, total] = await Promise.all([
    Student.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('batch', 'name status')
      .populate('courses', 'name subject'),
    Student.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: items,
    meta: paginationMeta({ page, limit, total }),
  });
});

/** GET /api/students/:id */
export const getStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id)
    .populate('batch', 'name status course')
    .populate('courses', 'name subject standardFeePaise');

  if (!student) throw new ApiError(404, 'Student not found.');
  res.json({ success: true, data: student });
});

/** POST /api/students */
export const createStudent = asyncHandler(async (req, res) => {
  const payload = pick(req.body, EDITABLE_FIELDS);

  // Prevent obvious accidental duplicates (same name + guardian phone).
  const duplicate = await Student.findOne({
    fullName: new RegExp(`^${escapeRegex(payload.fullName)}$`, 'i'),
    guardianPhone: payload.guardianPhone,
  });
  if (duplicate) {
    throw new ApiError(409, 'A student with the same name and guardian phone already exists.');
  }

  // Validate referenced course and batch.
  if (payload.batch) {
    const batch = await Batch.findById(payload.batch);
    if (!batch) throw new ApiError(400, 'Selected batch does not exist.');
    payload.batch = batch._id;
  }
  if (Array.isArray(payload.courses) && payload.courses.length > 0) {
    const count = await Course.countDocuments({ _id: { $in: payload.courses } });
    if (count !== payload.courses.length) {
      throw new ApiError(400, 'One or more selected courses do not exist.');
    }
  }

  const student = new Student({ ...payload, studentId: await nextStudentId() });
  await student.save();

  if (student.batch) {
    const batch = await Batch.findById(student.batch);
    await enrollStudentInBatch(student, batch);
  }

  await recordAudit({
    req,
    action: 'student.create',
    entityType: 'Student',
    entityId: student._id,
    description: `Created student ${student.studentId} (${student.fullName})`,
  });

  res.status(201).json({ success: true, message: 'Student created successfully.', data: student });
});

/** PUT /api/students/:id */
export const updateStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, 'Student not found.');

  const payload = pick(req.body, EDITABLE_FIELDS);
  const previousBatch = student.batch ? String(student.batch) : null;

  if (payload.batch) {
    const batch = await Batch.findById(payload.batch);
    if (!batch) throw new ApiError(400, 'Selected batch does not exist.');
  }
  if (Array.isArray(payload.courses) && payload.courses.length > 0) {
    const count = await Course.countDocuments({ _id: { $in: payload.courses } });
    if (count !== payload.courses.length) {
      throw new ApiError(400, 'One or more selected courses do not exist.');
    }
  }

  Object.assign(student, payload);
  await student.save();

  const newBatch = student.batch ? String(student.batch) : null;

  // Keep batch rosters in sync when the batch changed.
  if (previousBatch && previousBatch !== newBatch) {
    await unenrollStudentFromBatch(student._id, previousBatch);
  }
  if (newBatch && newBatch !== previousBatch) {
    const batch = await Batch.findById(newBatch);
    await enrollStudentInBatch(student, batch);
  }

  await recordAudit({
    req,
    action: 'student.update',
    entityType: 'Student',
    entityId: student._id,
    description: `Updated student ${student.studentId}`,
  });

  res.json({ success: true, message: 'Student updated successfully.', data: student });
});

/**
 * DELETE /api/students/:id
 * Only allowed when there is NO attendance or payment history. Otherwise the
 * student must be deactivated to preserve financial and attendance records.
 */
export const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, 'Student not found.');

  const [attendanceCount, paymentCount] = await Promise.all([
    Attendance.countDocuments({ student: student._id }),
    Payment.countDocuments({ student: student._id }),
  ]);

  if (attendanceCount > 0 || paymentCount > 0) {
    throw new ApiError(
      409,
      'This student has attendance or payment history and cannot be deleted. Set the status to inactive instead.'
    );
  }

  await unenrollStudentFromBatch(student._id, student.batch);
  await student.deleteOne();

  await recordAudit({
    req,
    action: 'student.delete',
    entityType: 'Student',
    entityId: student._id,
    description: `Deleted student ${student.studentId} (${student.fullName})`,
  });

  res.json({ success: true, message: 'Student deleted successfully.' });
});
