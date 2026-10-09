/**
 * A predictable error we can throw anywhere and let the central error
 * handler turn into a clean JSON response.
 */
export class ApiError extends Error {
  /**
   * @param {number} statusCode HTTP status code (e.g. 400, 401, 404)
   * @param {string} message   Safe message that is OK to show the user
   * @param {object} [details] Extra validation details (optional)
   */
  constructor(statusCode, message, details) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default ApiError;
