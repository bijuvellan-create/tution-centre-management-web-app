import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import User from '../models/User.js';
import { signAccessToken } from '../utils/jwt.js';
import { hashPassword, verifyPassword, passwordIssues } from '../utils/password.js';
import { recordAudit } from '../services/audit.service.js';

// Used to keep response time consistent whether or not the email exists,
// which makes it harder to discover valid email addresses.
let dummyHash = null;
async function spendComparableTime(password) {
  if (!dummyHash) dummyHash = await hashPassword('this-is-not-a-real-password');
  await verifyPassword(password, dummyHash);
}

/** POST /api/auth/login */
export const login = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  const password = String(req.body.password || '');

  const user = await User.findOne({ email }).select('+passwordHash');
  const invalid = new ApiError(401, 'Invalid email or password.');

  if (!user) {
    await spendComparableTime(password);
    throw invalid;
  }

  const passwordMatches = await user.comparePassword(password);
  if (!passwordMatches) throw invalid;

  if (!user.isActive) {
    throw new ApiError(403, 'Your account has been deactivated. Please contact an administrator.');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const token = signAccessToken(user);
  await recordAudit({
    req,
    action: 'auth.login',
    entityType: 'User',
    entityId: user._id,
    description: `${user.email} logged in`,
  });

  res.json({
    success: true,
    message: 'Logged in successfully.',
    data: { token, user: user.toJSON() },
  });
});

/** POST /api/auth/logout — tokens are stateless, so the client just drops it. */
export const logout = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully.' });
});

/** GET /api/auth/me — returns the currently logged-in user. */
export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user.toJSON() } });
});

/** POST /api/auth/change-password */
export const changePassword = asyncHandler(async (req, res) => {
  const currentPassword = String(req.body.currentPassword || '');
  const newPassword = String(req.body.newPassword || '');

  const user = await User.findById(req.user._id).select('+passwordHash');

  const matches = await user.comparePassword(currentPassword);
  if (!matches) {
    throw new ApiError(400, 'Current password is incorrect.');
  }

  if (currentPassword === newPassword) {
    throw new ApiError(400, 'New password must be different from the current password.');
  }

  const issues = passwordIssues(newPassword);
  if (issues.length > 0) {
    throw new ApiError(
      400,
      'New password is not strong enough.',
      issues.map((message) => ({ field: 'newPassword', message }))
    );
  }

  await user.setPassword(newPassword);
  await user.save();

  // Old tokens become invalid (passwordChangedAt), so issue a fresh one.
  const token = signAccessToken(user);

  await recordAudit({
    req,
    action: 'auth.change_password',
    entityType: 'User',
    entityId: user._id,
    description: `${user.email} changed password`,
  });

  res.json({
    success: true,
    message: 'Password updated successfully.',
    data: { token, user: user.toJSON() },
  });
});
