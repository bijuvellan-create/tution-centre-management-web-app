import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Central error handler. Every error in the app ends up here, so responses
 * always have the same shape:
 *   { success: false, message: "human readable text", errors?: [...] }
 *
 * In production we never leak stack traces or internal error names.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong.';
  let details = err.details;

  // --- Mongoose: validation failed (missing/invalid required fields) ---
  if (err.name === 'ValidationError') {
    statusCode = 400;
    details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    message = 'Validation failed. Please check the highlighted fields.';
  }

  // --- Mongoose: bad ObjectId in a URL/param ---
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for "${err.path}".`;
  }

  // --- MongoDB: duplicate key (unique index violated) ---
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `A record with this ${field} already exists.`;
  }

  // --- JWT problems ---
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your session has expired. Please log in again.';
  }

  // Unexpected errors are logged with a stack for debugging.
  const isOperational = err instanceof ApiError || err.isOperational;
  if (!isOperational || statusCode >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}:`, err);
  }

  const body = { success: false, message };
  if (details) body.errors = details;
  if (!env.isProd && !isOperational) body.stack = err.stack;

  res.status(statusCode).json(body);
}

export default errorHandler;
