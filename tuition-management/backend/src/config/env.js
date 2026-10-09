import dotenv from 'dotenv';

dotenv.config();

/**
 * Reads and normalises environment variables once, in one place.
 * Every other file imports this object instead of touching process.env directly.
 */
const nodeEnv = process.env.NODE_ENV || 'development';
const isTest = nodeEnv === 'test';

export const env = {
  nodeEnv,
  port: Number.parseInt(process.env.PORT || '5000', 10),
  mongoUri: process.env.MONGODB_URI || '',
  // In tests we fall back to a throwaway secret so the suite runs without a .env.
  jwtSecret: process.env.JWT_SECRET || (isTest ? 'test-only-secret-not-for-production-1234567890' : ''),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30m',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  appName: process.env.APP_NAME || 'Smart Tuition Manager',
  timezone: process.env.TZ || 'Asia/Kolkata',
  // Demo administrator used only by the in-memory development database.
  devAdminName: process.env.DEV_ADMIN_NAME || 'Demo Administrator',
  devAdminEmail: process.env.DEV_ADMIN_EMAIL || '',
  devAdminPassword: process.env.DEV_ADMIN_PASSWORD || '',
};

env.isProd = nodeEnv === 'production';
env.isTest = isTest;
env.isDev = nodeEnv === 'development';

/**
 * Development convenience: if no real database is configured, fall back to a
 * temporary in-memory MongoDB so the app can be tried instantly. This NEVER
 * happens in production, and any data is discarded when the server stops.
 */
env.useMemoryDb =
  !env.isProd && (process.env.USE_MEMORY_DB === 'true' || (!env.mongoUri && !isTest));

/**
 * Validates that the critical values exist so we fail fast with a friendly
 * message instead of crashing later with a confusing error.
 * Returns a list of human readable problems (empty = all good).
 */
export function checkEnv() {
  const problems = [];

  if (!env.useMemoryDb) {
    if (!env.mongoUri) {
      problems.push(
        'MONGODB_URI is missing. Copy backend/.env.example to backend/.env and add your MongoDB Atlas connection string.'
      );
    } else if (!env.mongoUri.startsWith('mongodb')) {
      problems.push('MONGODB_URI does not look like a valid MongoDB connection string.');
    }
  }

  if (!env.jwtSecret) {
    problems.push(
      'JWT_SECRET is missing. Add a long random value (at least 32 characters) to backend/.env.'
    );
  } else if (env.jwtSecret.length < 32) {
    problems.push('JWT_SECRET is too short. Use at least 32 characters for security.');
  }

  if (env.isProd && env.jwtSecret && env.jwtSecret.includes('change-me')) {
    problems.push('JWT_SECRET is still the example value. Set a real secret before production.');
  }

  return problems;
}
