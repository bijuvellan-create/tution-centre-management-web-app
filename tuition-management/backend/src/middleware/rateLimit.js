import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

/**
 * Limits repeated login attempts to slow down password guessing.
 * 10 attempts per 15 minutes per IP.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isTest ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in a few minutes.',
  },
});

/**
 * A gentler limit for the whole API to discourage abuse.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isTest ? 100000 : 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down and try again shortly.',
  },
});
