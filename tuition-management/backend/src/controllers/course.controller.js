import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import Course from '../models/Course.js';
import Batch from '../models/Batch.js';
import { pick } from '../utils/pick.js';
import { getPagination, paginationMeta, escapeRegex } from '../utils/pagination.js';
import { recordAudit } from '../services/audit.service.js';

const EDITABLE_FIELDS = [
  'name',
  'subject',
  'grade',
  'description',
  'durationMonths',
  'standardFeePaise',
  'status',
];

/** GET /api/courses */
export const listCourses = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 50 });
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search.trim()), 'i');
    filter.$or = [{ name: rx }, { subject: rx }, { grade: rx }];
  }

  const [items, total] = await Promise.all([
    Course.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Course.countDocuments(filter),
  ]);

  res.json({ success: true, data: items, meta: paginationMeta({ page, limit, total }) });
});

/** GET /api/courses/:id */
export const getCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, 'Course not found.');
  res.json({ success: true, data: course });
});

/** POST /api/courses */
export const createCourse = asyncHandler(async (req, res) => {
  const course = new Course(pick(req.body, EDITABLE_FIELDS));
  await course.save();

  await recordAudit({
    req,
    action: 'course.create',
    entityType: 'Course',
    entityId: course._id,
    description: `Created course ${course.name}`,
  });

  res.status(201).json({ success: true, message: 'Course created successfully.', data: course });
});

/** PUT /api/courses/:id */
export const updateCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, 'Course not found.');

  Object.assign(course, pick(req.body, EDITABLE_FIELDS));
  await course.save();

  await recordAudit({
    req,
    action: 'course.update',
    entityType: 'Course',
    entityId: course._id,
    description: `Updated course ${course.name}`,
  });

  res.json({ success: true, message: 'Course updated successfully.', data: course });
});

/** PATCH /api/courses/:id/deactivate — soft disable, keeps history intact. */
export const deactivateCourse = asyncHandler(async (req, res) => {
  const course = await Course.findByIdAndUpdate(
    req.params.id,
    { status: 'inactive' },
    { new: true }
  );
  if (!course) throw new ApiError(404, 'Course not found.');
  res.json({ success: true, message: 'Course deactivated.', data: course });
});

/** PATCH /api/courses/:id/activate */
export const activateCourse = asyncHandler(async (req, res) => {
  const course = await Course.findByIdAndUpdate(req.params.id, { status: 'active' }, { new: true });
  if (!course) throw new ApiError(404, 'Course not found.');
  res.json({ success: true, message: 'Course activated.', data: course });
});

/** DELETE /api/courses/:id — blocked if batches still use it. */
export const deleteCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, 'Course not found.');

  const batches = await Batch.countDocuments({ course: course._id });
  if (batches > 0) {
    throw new ApiError(
      409,
      `This course is used by ${batches} batch(es). Deactivate it instead of deleting.`
    );
  }

  await course.deleteOne();

  await recordAudit({
    req,
    action: 'course.delete',
    entityType: 'Course',
    entityId: course._id,
    description: `Deleted course ${course.name}`,
  });

  res.json({ success: true, message: 'Course deleted successfully.' });
});
