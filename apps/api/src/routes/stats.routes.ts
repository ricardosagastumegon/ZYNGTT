import { Router } from 'express';
import { statsService } from '../services/stats.service';
import { adminStatsService } from '../services/admin-stats.service';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role.middleware';
import { asyncHandler } from '../middleware/asyncHandler';

export const statsRoutes = Router();
statsRoutes.use(authenticate);

statsRoutes.get('/dashboard', asyncHandler(async (req, res) => {
  const data = await statsService.getDashboardStats(req.user!.userId);
  res.json({ success: true, data });
}));

statsRoutes.get('/admin', requireRole('ADMIN', 'SUPERADMIN'), asyncHandler(async (_req, res) => {
  const data = await adminStatsService.getStats();
  res.json({ success: true, data });
}));

statsRoutes.get('/report', asyncHandler(async (req, res) => {
  const from = new Date((req.query.from as string) ?? new Date(Date.now() - 30 * 86400000));
  const to = new Date((req.query.to as string) ?? new Date());
  const data = await statsService.getReport(req.user!.userId, from, to);
  res.json({ success: true, data });
}));
