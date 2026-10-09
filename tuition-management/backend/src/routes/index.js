import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import studentRoutes from './student.routes.js';
import teacherRoutes from './teacher.routes.js';
import courseRoutes from './course.routes.js';
import batchRoutes from './batch.routes.js';
import attendanceRoutes from './attendance.routes.js';
import feeRoutes from './fee.routes.js';
import paymentRoutes from './payment.routes.js';
import userRoutes from './user.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import reportsRoutes from './reports.routes.js';
import { apiLimiter } from '../middleware/rateLimit.js';

/**
 * Central API router. Every feature router is mounted here under /api.
 */
const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', apiLimiter, authRoutes);
router.use('/students', apiLimiter, studentRoutes);
router.use('/teachers', apiLimiter, teacherRoutes);
router.use('/courses', apiLimiter, courseRoutes);
router.use('/batches', apiLimiter, batchRoutes);
router.use('/attendance', apiLimiter, attendanceRoutes);
router.use('/fees', apiLimiter, feeRoutes);
router.use('/payments', apiLimiter, paymentRoutes);
router.use('/users', apiLimiter, userRoutes);
router.use('/dashboard', apiLimiter, dashboardRoutes);
router.use('/reports', apiLimiter, reportsRoutes);

export default router;
