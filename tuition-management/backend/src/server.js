import app from './app.js';
import { env, checkEnv } from './config/env.js';
import { connectDB, disconnectDB, dbStatus, startMemoryDB, stopMemoryDB } from './config/db.js';

const RETRY_MS = 5000;
let retryTimer = null;
let seeded = false;

/**
 * In development with no configured database, create a ready-to-use admin so
 * the app can be logged into immediately. Never runs in production.
 */
async function ensureDevAdmin() {
  if (seeded) return;
  seeded = true;
  const { default: User } = await import('./models/User.js');
  const existing = await User.countDocuments({ role: 'admin' });
  if (existing > 0) return;

  const email = env.devAdminEmail || 'admin@demo.local';
  const password = env.devAdminPassword || 'Demo@12345';
  const admin = new User({ name: env.devAdminName, email, role: 'admin', isActive: true });
  await admin.setPassword(password);
  await admin.save();

  console.log('\n[dev] In-memory database ready. Demo administrator created:');
  console.log(`[dev]   email    : ${email}`);
  console.log(`[dev]   password : ${password}`);
  console.log('[dev] Change this password after signing in (My account).\n');
}

/**
 * Keeps trying to connect to MongoDB every few seconds so the server can
 * recover automatically if the database is temporarily unreachable.
 */
async function connectWithRetry() {
  try {
    await connectDB(env.mongoUri);
    console.log(`[db] MongoDB connected (${env.mongoUri.split('@')[1] || 'local'})`);
    if (env.useMemoryDb) await ensureDevAdmin();
  } catch (error) {
    console.error(`[db] Connection failed: ${error.message}`);
    console.error(`[db] Retrying in ${RETRY_MS / 1000}s... (status: ${dbStatus()})`);
    retryTimer = setTimeout(connectWithRetry, RETRY_MS);
  }
}

async function start() {
  const problems = checkEnv();
  if (problems.length > 0) {
    console.error('\n[config] The server cannot start because of configuration problems:\n');
    for (const p of problems) console.error(`  - ${p}`);
    console.error('\nSee backend/.env.example for the required variables.\n');
    process.exit(1);
  }

  if (env.useMemoryDb) {
    console.log('[db] No MONGODB_URI configured — starting a temporary in-memory database.');
    console.log('[db] Data will be LOST when the server stops. Add MONGODB_URI for persistence.');
    env.mongoUri = await startMemoryDB();
  }

  const server = app.listen(env.port, () => {
    console.log(`[api] ${env.appName} API listening on http://localhost:${env.port}`);
    console.log(`[api] Environment: ${env.nodeEnv}`);
    console.log(`[api] Health check: http://localhost:${env.port}/api/health`);
  });

  connectWithRetry();

  const shutdown = async (signal) => {
    console.log(`\n[api] ${signal} received. Shutting down...`);
    if (retryTimer) clearTimeout(retryTimer);
    server.close(async () => {
      await disconnectDB().catch(() => {});
      await stopMemoryDB();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
