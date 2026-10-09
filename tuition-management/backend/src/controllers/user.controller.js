import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import User from '../models/User.js';
import Teacher from '../models/Teacher.js';
import { pick } from '../utils/pick.js';
import { getPagination, paginationMeta, escapeRegex } from '../utils/pagination.js';
import { passwordIssues } from '../utils/password.js';
import { recordAudit } from '../services/audit.service.js';

/** Counts how many active admins exist (used to protect the last one). */
async function activeAdminCount() {
  return User.countDocuments({ role: 'admin', isActive: true });
}

/** GET /api/users */
export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.status) filter.isActive = req.query.status === 'active';
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search.trim()), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }

  const [items, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('teacherProfile', 'fullName teacherId'),
    User.countDocuments(filter),
  ]);

  res.json({ success: true, data: items, meta: paginationMeta({ page, limit, total }) });
});

/** POST /api/users — admins create accounts for other admins or teachers. */
export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  const issues = passwordIssues(password);
  if (issues.length > 0) {
    throw new ApiError(
      400,
      'Password is not strong enough.',
      issues.map((message) => ({ field: 'password', message }))
    );
  }

  const existing = await User.findOne({ email: String(email).toLowerCase() });
  if (existing) throw new ApiError(409, 'A user with this email already exists.');

  let teacherProfile;
  if (req.body.teacherProfile) {
    const teacher = await Teacher.findById(req.body.teacherProfile);
    if (!teacher) throw new ApiError(400, 'Linked teacher profile not found.');
    teacherProfile = teacher._id;
  }

  const user = new User({ name, email, role, teacherProfile });
  await user.setPassword(password);
  await user.save();

  if (teacherProfile) {
    await Teacher.updateOne({ _id: teacherProfile }, { userId: user._id });
  }

  await recordAudit({
    req,
    action: 'user.create',
    entityType: 'User',
    entityId: user._id,
    description: `Created ${role} account for ${user.email}`,
  });

  res.status(201).json({ success: true, message: 'User created successfully.', data: user });
});

/** PUT /api/users/:id */
export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');

  const payload = pick(req.body, ['name', 'role', 'isActive', 'teacherProfile']);
  const isSelf = String(user._id) === String(req.user._id);

  if (isSelf && payload.isActive === false) {
    throw new ApiError(400, 'You cannot deactivate your own account.');
  }
  if (isSelf && payload.role && payload.role !== 'admin') {
    throw new ApiError(400, 'You cannot remove your own administrator role.');
  }
  // Do not allow the last active admin to be demoted or deactivated.
  if (
    user.role === 'admin' &&
    isSelf === false &&
    ((payload.role && payload.role !== 'admin') || payload.isActive === false)
  ) {
    const admins = await activeAdminCount();
    if (admins <= 1) throw new ApiError(400, 'At least one active administrator must remain.');
  }

  Object.assign(user, payload);
  await user.save();

  await recordAudit({
    req,
    action: 'user.update',
    entityType: 'User',
    entityId: user._id,
    description: `Updated account ${user.email}`,
  });

  res.json({ success: true, message: 'User updated successfully.', data: user });
});

/** PUT /api/users/:id/password — admin resets another user's password. */
export const resetUserPassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('+passwordHash');
  if (!user) throw new ApiError(404, 'User not found.');

  const { newPassword } = req.body;
  const issues = passwordIssues(newPassword);
  if (issues.length > 0) {
    throw new ApiError(
      400,
      'Password is not strong enough.',
      issues.map((message) => ({ field: 'newPassword', message }))
    );
  }

  await user.setPassword(newPassword);
  await user.save();

  await recordAudit({
    req,
    action: 'user.reset_password',
    entityType: 'User',
    entityId: user._id,
    description: `Reset password for ${user.email}`,
  });

  res.json({ success: true, message: 'Password reset successfully.' });
});

/** DELETE /api/users/:id */
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');

  if (String(user._id) === String(req.user._id)) {
    throw new ApiError(400, 'You cannot delete your own account.');
  }
  if (user.role === 'admin') {
    const admins = await activeAdminCount();
    if (admins <= 1) throw new ApiError(400, 'The last administrator cannot be deleted.');
  }

  if (user.teacherProfile) {
    await Teacher.updateOne({ _id: user.teacherProfile }, { $unset: { userId: 1 } });
  }
  await user.deleteOne();

  await recordAudit({
    req,
    action: 'user.delete',
    entityType: 'User',
    entityId: user._id,
    description: `Deleted account ${user.email}`,
  });

  res.json({ success: true, message: 'User deleted successfully.' });
});
