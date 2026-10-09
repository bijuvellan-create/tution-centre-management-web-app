import { Router } from 'express';
import { dbStatus, isDbConnected } from '../config/db.js';
import { env } from '../config/env.js';

const router = Router();

/**
 * GET /api/health
 * A simple endpoint to check whether the API and database are alive.
 * Useful for deployment health checks on Render.
 */
router.get('/', (req, res) => {
  const db = dbStatus();
  res.status(isDbConnected() ? 200 : 503).json({
    status: isDbConnected() ? 'ok' : 'degraded',
    app: env.appName,
    environment: env.nodeEnv,
    database: db,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

export default router;
