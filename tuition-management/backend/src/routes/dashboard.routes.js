import { Router } from 'express';
import { verifyToken, authorize } from '../middleware/auth.js';
import * as c from '../controllers/dashboard.controller.js';

const router = Router();

// Admins see everything; teachers see a reduced summary (handled in the controller).
router.get('/summary', verifyToken, authorize('admin', 'teacher'), c.getSummary);

export default router;
