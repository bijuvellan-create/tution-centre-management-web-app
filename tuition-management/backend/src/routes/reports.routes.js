import { Router } from 'express';
import { verifyToken, requireAdmin, authorize } from '../middleware/auth.js';
import * as c from '../controllers/reports.controller.js';

const router = Router();
router.use(verifyToken);

// Student/teacher/fee reports contain personal or financial data -> admin only.
router.get('/students', requireAdmin, c.studentsReport);
router.get('/teachers', requireAdmin, c.teachersReport);
router.get('/fees', requireAdmin, c.feesReport);

// Attendance reports are available to teachers (scoped to their batches).
router.get('/attendance', authorize('admin', 'teacher'), c.attendanceReport);

export default router;
