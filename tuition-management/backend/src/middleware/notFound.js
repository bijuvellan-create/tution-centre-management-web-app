/**
 * Sends a 404 JSON response for any route that did not match.
 * Placed AFTER all routes in app.js.
 */
export function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export default notFound;
