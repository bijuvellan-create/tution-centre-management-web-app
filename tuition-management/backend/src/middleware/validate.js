import { validationResult } from 'express-validator';

/**
 * Runs AFTER express-validator checks in a route and turns any failures
 * into a single clean 422 response. If everything is valid it calls next().
 */
export function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array().map((e) => ({
    field: e.path,
    message: e.msg,
  }));

  return res.status(422).json({
    success: false,
    message: 'Validation failed. Please check the highlighted fields.',
    errors,
  });
}

export default validate;
