/**
 * Wraps an async route handler so rejected promises are forwarded to
 * Express's error handler automatically. This removes the need for
 * try/catch in every controller.
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default asyncHandler;
