import bcrypt from 'bcryptjs';

// Cost factor: higher = slower to crack but slower to log in.
// 12 is a good balance in 2026.
const SALT_ROUNDS = 12;

/** Turns a plain password into a one-way hash. Never store the plain text. */
export function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/** Checks a plain password against a stored hash. Returns true/false. */
export function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

/**
 * Returns a list of human-readable problems with a password.
 * Empty list means the password is acceptable.
 */
export function passwordIssues(password) {
  const issues = [];
  if (typeof password !== 'string' || password.length < 8) {
    issues.push('Password must be at least 8 characters long.');
  }
  if (!/[A-Za-z]/.test(password || '')) {
    issues.push('Password must contain at least one letter.');
  }
  if (!/[0-9]/.test(password || '')) {
    issues.push('Password must contain at least one number.');
  }
  return issues;
}
