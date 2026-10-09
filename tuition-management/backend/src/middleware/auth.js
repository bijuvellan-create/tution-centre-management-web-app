import { verifyAccessToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import User from '../models/User.js';

/**
 * Authentication middleware.
 * Reads the "Authorization: Bearer <token>" header, verifies the token,
 * loads the user from the database and attaches it as req.user.
 *
 * Loading from the database on every request means deactivated accounts
 * are blocked immediately, not just when the token expires.
 */
export const verifyToken = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new ApiError(401, 'Authentication required. Please log in.');
  }

  // Throws JsonWebTokenError / TokenExpiredError, mapped to 401 centrally.
  const payload = verifyAccessToken(token);

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    throw new ApiError(401, 'Account not found or deactivated.');
  }

  // A token is only valid if it was issued for the current token version.
  // Changing a password bumps the version, instantly invalidating old tokens.
  if ((payload.tv ?? 0) !== (user.tokenVersion ?? 0)) {
    throw new ApiError(401, 'Session expired. Please log in again.');
  }

  req.user = user;
  req.token = token;
  next();
});

/**
 * Authorization middleware factory.
 * Usage: router.post('/', verifyToken, authorize('admin'), handler)
 * This is the REAL security check; hiding buttons in React is not enough.
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required.'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action.'));
    }
    return next();
  };
}

export const requireAdmin = authorize('admin');
export const requireTeacherOrAdmin = authorize('teacher', 'admin');
