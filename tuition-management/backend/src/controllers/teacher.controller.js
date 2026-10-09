import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import Teacher from '../models/Teacher.js';
import Batch from '../models/Batch.js';
import { nextTeacherId } from '../utils/sequence.js';
import { pick } from '../utils/pick.js';
import { getPagination, paginationMeta, escapeRegex } from '../utils/pagination.js';
import { recordAudit } from '../services/audit.service.js';

const EDITABLE_FIELDS = [
  'fullName',
  'phone',
  'email',
  'subjects',
  'qualifications',
  'joiningDate',
  'status',
  'notes',
];

function buildFilter(query) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.subject) filter.subjects = query.subject;
  if (query.search) {
    const rx = new RegExp(escapeRegex(query.search.trim()), 'i');
    filter.$or = [{ fullName: rx }, { teacherId: rx }, { phone: rx }, { email: rx }];
  }
  return filter;
}

/** GET /api/teachers */
export const listTeachers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = buildFilter(req.query);

  const [items, total] = await Promise.all([
    Teacher.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Teacher.countDocuments(filter),
  ]);

  res.json({ success: true, data: items, meta: paginationMeta({ page, limit, total }) });
});

/** GET /api/teachers/:id — includes the batches this teacher is assigned to. */
export const getTeacher = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findById(req.params.id);
  if (!teacher) throw new ApiError(404, 'Teacher not found.');

  const batches = await Batch.find({ teacher: teacher._id })
    .select('name status course students')
    .populate('course', 'name subject');

  res.json({ success: true, data: { ...teacher.toObject(), batches } });
});

/** POST /api/teachers */
export const createTeacher = asyncHandler(async (req, res) => {
  const payload = pick(req.body, EDITABLE_FIELDS);

  const teacher = new Teacher({ ...payload, teacherId: await nextTeacherId() });
  await teacher.save();

  await recordAudit({
    req,
    action: 'teacher.create',
    entityType: 'Teacher',
    entityId: teacher._id,
    description: `Created teacher ${teacher.teacherId} (${teacher.fullName})`,
  });

  res.status(201).json({ success: true, message: 'Teacher created successfully.', data: teacher });
});

/** PUT /api/teachers/:id */
export const updateTeacher = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findById(req.params.id);
  if (!teacher) throw new ApiError(404, 'Teacher not found.');

  Object.assign(teacher, pick(req.body, EDITABLE_FIELDS));
  await teacher.save();

  await recordAudit({
    req,
    action: 'teacher.update',
    entityType: 'Teacher',
    entityId: teacher._id,
    description: `Updated teacher ${teacher.teacherId}`,
  });

  res.json({ success: true, message: 'Teacher updated successfully.', data: teacher });
});

/**
 * DELETE /api/teachers/:id
 * Blocked while the teacher is assigned to a batch so batches never lose
 * their owner silently. Deactivate instead.
 */
export const deleteTeacher = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findById(req.params.id);
  if (!teacher) throw new ApiError(404, 'Teacher not found.');

  const assigned = await Batch.countDocuments({ teacher: teacher._id });
  if (assigned > 0) {
    throw new ApiError(
      409,
      `This teacher is assigned to ${assigned} batch(es). Reassign them or set the status to inactive instead.`
    );
  }

  await teacher.deleteOne();

  await recordAudit({
    req,
    action: 'teacher.delete',
    entityType: 'Teacher',
    entityId: teacher._id,
    description: `Deleted teacher ${teacher.teacherId} (${teacher.fullName})`,
  });

  res.json({ success: true, message: 'Teacher deleted successfully.' });
});
