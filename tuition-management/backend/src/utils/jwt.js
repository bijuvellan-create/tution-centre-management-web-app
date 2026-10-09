import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const ISSUER = 'smart-tuition-manager';

/**
 * Creates a signed access token that proves who the user is.
 * The token payload is intentionally small: user id + role.
 */
export function signAccessToken(user) {
  return jwt.sign(
    { sub: String(user._id), role: user.role, tv: user.tokenVersion ?? 0 },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn, issuer: ISSUER }
  );
}

/** Verifies a token. Throws if it is invalid or expired. */
export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret, { issuer: ISSUER });
}
