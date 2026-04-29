import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role.middleware';
import { asyncHandler } from '../middleware/asyncHandler';

const prisma = new PrismaClient();

export const userRoutes = Router();

userRoutes.use(authenticate);
userRoutes.get('/me', asyncHandler(userController.me));
userRoutes.put('/profile', asyncHandler(userController.updateProfile));

// Admin: list all users (optionally filtered by role)
userRoutes.get('/', requireRole('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
  const role = req.query.role as string | undefined;
  const users = await prisma.user.findMany({
    where: role ? { role: role as never } : undefined,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, firstName: true, lastName: true, email: true,
      role: true, createdAt: true,
      company: { select: { name: true } },
    },
  });
  res.json({ success: true, data: users });
}));
