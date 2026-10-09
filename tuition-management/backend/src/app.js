import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';

import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Trust the first proxy (Render/Vercel) so rate limiting sees real client IPs.
app.set('trust proxy', 1);
app.disable('x-powered-by');

// --- Security headers ---
app.use(helmet());

// --- CORS ---
// Only the frontend URL(s) listed in FRONTEND_URL may call this API.
// Comma-separated values are supported (e.g. local dev + production).
const allowedOrigins = env.frontendUrl
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow tools like curl/Postman that send no Origin header.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  })
);

// --- Body parsing with a safe size limit ---
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// --- Remove dangerous Mongo operators ($ and .) from user input ---
app.use(mongoSanitize());

// --- Request logging (quiet during tests) ---
if (!env.isTest) {
  app.use(morgan(env.isProd ? 'combined' : 'dev'));
}

// --- API routes ---
app.use('/api', apiRoutes);

// --- 404 + central error handling (must be last) ---
app.use(notFound);
app.use(errorHandler);

export default app;
