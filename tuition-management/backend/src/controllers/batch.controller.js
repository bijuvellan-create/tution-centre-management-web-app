import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import Batch from '../models/Batch.js';
import Course from '../models/Course.js';
import Teacher from '../models/Teacher.js';
import Student from '../models/Student.js';
import Attendance from '../models/Attendance.js';
import { pick } from '../utils/pick.js';
import { getPagination, paginationMeta, escapeRegex } from '../utils/pagination.js';
import { recordAudit } from '../services/audit.service.js';
import { enrollStudentInBatch, unenrollStudentFromBatch } from '../services/enrollment.service.js';

const EDITABLE_FIELDS = [
  'name',
  'course',
  'teacher',
  'startDate',
  'endDate',
  'classDays',
  'startTime',
  'endTime',
  'capacity',
  'status',
];

function timeToMinutes(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value || '');
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Looks for an active batch of the SAME teacher that meets on an overlapping
 * day and time. This is a practical guard against double-booking.
 */
async function assertNoScheduleConflict({ teacher, classDays = [], startTime, endTime, excludeId }) {
  if (!teacher || !startTime || !endTime || classDays.length === 0) return;

  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start === null || end === null || end <= start) {
    throw new ApiError(400, 'End time must be after start time (use 24-hour HH:mm).');
  }

  const query = { teacher, status: 'active', classDays: { $in: classDays } };
  if (excludeId) query._id = { $ne: excludeId };

  const others = await Batch.find(query).select('name classDays startTime endTime');
  for (const other of others) {
    const oStart = timeToMinutes(other.startTime);
    const oEnd = timeToMinutes(other.endTime);
    if (oStart === null || oEnd === null) continue;
    const daysOverlap = other.classDays.some((d) => classDays.includes(d));
    const timeOverlap = start < oEnd && oStart < end;
    if (daysOverlap && timeOverlap) {
      throw new ApiError(
        409,
        `Schedule conflict with batch "${other.name}" for the same teacher.`
      );
    }
  }
}

/** GET /api/batches */
export const listBatches = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 50 });
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.course) filter.course = req.query.course;
  if (req.query.teacher) filter.teacher = req.query.teacher;
  if (req.query.search) {
    filter.name = new RegExp(escapeRegex(req.query.search.trim()), 'i');
  }

  // Teachers only ever see their own batches.
  if (req.user.role === 'teacher') {
    const teacher = await Teacher.findOne({ userId: req.user._id });
    filter.teacher = teacher ? teacher._id : null;
  }

  const [items, total] = await Promise.all([
    Batch.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('course', 'name subject standardFeePaise')
      .populate('teacher', 'fullName teacherId'),
    Batch.countDocuments(filter),
  ]);

  res.json({ success: true, data: items, meta: paginationMeta({ page, limit, total }) });
});

/** GET /api/batches/:id — includes the enrolled students. */
export const getBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.findById(req.params.id)
    .populate('course', 'name subject standardFeePaise')
    .populate('teacher', 'fullName teacherId')
    .populate('students', 'studentId fullName guardianPhone status');

  if (!batch) throw new ApiError(404, 'Batch not found.');

  if (req.user.role === 'teacher') {
    const teacher = await Teacher.findOne({ userId: req.user._id });
    if (!teacher || String(batch.teacher) !== String(teacher._id)) {
      throw new ApiError(403, 'You can only view your assigned batches.');
    }
  }

  res.json({ success: true, data: batch });
});

/** POST /api/batches */
export const createBatch = asyncHandler(async (req, res) => {
  const payload = pick(req.body, EDITABLE_FIELDS);

  const course = await Course.findById(payload.course);
  if (!course) throw new ApiError(400, 'Selected course does not exist.');
  if (payload.teacher) {
    const teacher = await Teacher.findById(payload.teacher);
    if (!teacher) throw new ApiError(400, 'Selected teacher does not exist.');
  }

  await assertNoScheduleConflict(payload);

  const batch = new Batch(payload);
  await batch.save();

  await recordAudit({
    req,
    action: 'batch.create',
    entityType: 'Batch',
    entityId: batch._id,
    description: `Created batch ${batch.name}`,
  });

  res.status(201).json({ success: true, message: 'Batch created successfully.', data: batch });
});

/** PUT /api/batches/:id */
export const updateBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.findById(req.params.id);
  if (!batch) throw new ApiError(404, 'Batch not found.');

  const payload = pick(req.body, EDITABLE_FIELDS);

  if (payload.course) {
    const course = await Course.findById(payload.course);
    if (!course) throw new ApiError(400, 'Selected course does not exist.');
  }
  if (payload.teacher) {
    const teacher = await Teacher.findById(payload.teacher);
    if (!teacher) throw new ApiError(400, 'Selected teacher does not exist.');
  }

  await assertNoScheduleConflict({
    teacher: payload.teacher ?? batch.teacher,
    classDays: payload.classDays ?? batch.classDays,
    startTime: payload.startTime ?? batch.startTime,
    endTime: payload.endTime ?? batch.endTime,
    excludeId: batch._id,
  });

  // Do not allow capacity below the number of already enrolled students.
  if (payload.capacity !== undefined && payload.capacity < batch.students.length) {
    throw new ApiError(
      400,
      `Capacity cannot be lower than the ${batch.students.length} student(s) already enrolled.`
    );
  }

  Object.assign(batch, payload);
  await batch.save();

  await recordAudit({
    req,
    action: 'batch.update',
    entityType: 'Batch',
    entityId: batch._id,
    description: `Updated batch ${batch.name}`,
  });

  res.json({ success: true, message: 'Batch updated successfully.', data: batch });
});

/** PATCH /api/batches/:id/deactivate */
export const deactivateBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.findByIdAndUpdate(req.params.id, { status: 'inactive' }, { new: true });
  if (!batch) throw new ApiError(404, 'Batch not found.');
  res.json({ success: true, message: 'Batch deactivated.', data: batch });
});

/** PATCH /api/batches/:id/activate */
export const activateBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.findByIdAndUpdate(req.params.id, { status: 'active' }, { new: true });
  if (!batch) throw new ApiError(404, 'Batch not found.');
  res.json({ success: true, message: 'Batch activated.', data: batch });
});

/** DELETE /api/batches/:id — blocked when students or attendance exist. */
export const deleteBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.findById(req.params.id);
  if (!batch) throw new ApiError(404, 'Batch not found.');

  if (batch.students.length > 0) {
    throw new ApiError(409, 'This batch still has enrolled students. Remove them or deactivate the batch.');
  }
  const attendance = await Attendance.countDocuments({ batch: batch._id });
  if (attendance > 0) {
    throw new ApiError(409, 'This batch has attendance history. Deactivate it instead of deleting.');
  }

  await batch.deleteOne();

  await recordAudit({
    req,
    action: 'batch.delete',
    entityType: 'Batch',
    entityId: batch._id,
    description: `Deleted batch ${batch.name}`,
  });

  res.json({ success: true, message: 'Batch deleted successfully.' });
});

/** POST /api/batches/:id/students — enrol a student into this batch. */
export const enrollStudent = asyncHandler(async (req, res) => {
  const batch = await Batch.findById(req.params.id);
  if (!batch) throw new ApiError(404, 'Batch not found.');

  const student = await Student.findById(req.body.studentId);
  if (!student) throw new ApiError(400, 'Student not found.');
  if (student.status === 'inactive') {
    throw new ApiError(400, 'Cannot enrol an inactive student. Activate the student first.');
  }

  // A student can only belong to one batch at a time.
  if (student.batch && String(student.batch) !== String(batch._id)) {
    throw new ApiError(409, 'This student is already in another batch. Move them instead.');
  }

  await enrollStudentInBatch(student, batch);
  student.batch = batch._id;
  await student.save();

  await recordAudit({
    req,
    action: 'batch.enroll',
    entityType: 'Batch',
    entityId: batch._id,
    description: `Enrolled ${student.studentId} into ${batch.name}`,
  });

  res.json({ success: true, message: 'Student enrolled successfully.' });
});

/** DELETE /api/batches/:id/students/:studentId — remove a student. */
export const unenrollStudent = asyncHandler(async (req, res) => {
  const { id, studentId } = req.params;
  const batch = await Batch.findById(id);
  if (!batch) throw new ApiError(404, 'Batch not found.');

  await unenrollStudentFromBatch(studentId, batch._id);
  const student = await Student.findById(studentId);
  if (student && String(student.batch) === String(batch._id)) {
    student.batch = undefined;
    await student.save();
  }

  await recordAudit({
    req,
    action: 'batch.unenroll',
    entityType: 'Batch',
    entityId: batch._id,
    description: `Removed student ${studentId} from ${batch.name}`,
  });

  res.json({ success: true, message: 'Student removed from batch.' });
});
