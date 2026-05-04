import { Router } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role.middleware';
import { asyncHandler } from '../middleware/asyncHandler';
import { activityLogService } from '../services/activity-log.service';
import { AppError } from '../utils/AppError';


export const userRoutes = Router();

userRoutes.use(authenticate);
userRoutes.get('/me', asyncHandler(userController.me));
userRoutes.put('/me', asyncHandler(userController.updateProfile));
userRoutes.put('/profile', asyncHandler(userController.updateProfile));

// ── List users ─────────────────────────────────────────────────────────────
userRoutes.get('/', requireRole('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
  const role   = req.query.role   as string | undefined;
  const search = req.query.search as string | undefined;
  const page   = Math.max(1, Number(req.query.page  ?? 1));
  const limit  = Math.min(100, Math.max(1, Number(req.query.limit ?? 50)));

  const where = {
    ...(role ? { role: role as never } : {}),
    ...(search ? {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName:  { contains: search, mode: 'insensitive' as const } },
        { email:     { contains: search, mode: 'insensitive' as const } },
      ],
    } : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, firstName: true, lastName: true, email: true,
        role: true, isActive: true, phone: true, createdAt: true,
        company: { select: { id: true, name: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({ success: true, data: users, total, page, limit });
}));

// ── Create user ────────────────────────────────────────────────────────────
const createSchema = z.object({
  email:             z.string().email(),
  password:          z.string().min(8),
  firstName:         z.string().min(1),
  lastName:          z.string().min(1),
  role:              z.enum(['EMPRESA', 'AGENTE', 'TRANSPORTISTA', 'ADMIN', 'SUPERADMIN']),
  phone:             z.string().optional(),
  companyName:       z.string().optional(),
  companyNIT:        z.string().optional(),
  nitAgente:         z.string().optional(),
  agenciaNombre:     z.string().optional(),
  transporteEmpresa: z.string().optional(),
  caat:              z.string().optional(),
});

userRoutes.post('/', requireRole('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
  const data = createSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError('Email ya registrado', 409);

  const hashed = await bcrypt.hash(data.password, 12);

  const meta: Record<string, string> = {};
  if (data.nitAgente)         meta.nitAgente         = data.nitAgente;
  if (data.agenciaNombre)     meta.agenciaNombre     = data.agenciaNombre;
  if (data.transporteEmpresa) meta.transporteEmpresa = data.transporteEmpresa;
  if (data.caat)              meta.caat              = data.caat;

  const user = await prisma.user.create({
    data: {
      email:     data.email,
      password:  hashed,
      firstName: data.firstName,
      lastName:  data.lastName,
      role:      data.role as never,
      phone:     data.phone,
      metadata:  Object.keys(meta).length ? meta : undefined,
      ...(data.companyName ? {
        company: { create: { name: data.companyName, taxId: data.companyNIT } },
      } : {}),
    },
    include: { company: true },
  });

  await activityLogService.log(
    req.user!.userId, 'CREATE_USER',
    `Creó usuario ${user.email} con rol ${user.role}`,
    { targetUserId: user.id },
    req.ip,
  );

  const { password: _pw, ...safe } = user;
  res.status(201).json({ success: true, data: safe });
}));

// ── Get user detail ────────────────────────────────────────────────────────
userRoutes.get('/:id', requireRole('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      company: true,
      expedientes: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { shipment: { select: { reference: true, status: true } } },
      },
      credentials: {
        select: { system: true, createdAt: true, updatedAt: true },
      },
    },
  });
  if (!user) throw new AppError('Usuario no encontrado', 404);
  const { password: _pw, ...safe } = user;
  res.json({ success: true, data: safe });
}));

// ── Change role (SUPERADMIN only) ──────────────────────────────────────────
userRoutes.put('/:id/role', requireRole('SUPERADMIN'), asyncHandler(async (req, res) => {
  const { role } = z.object({
    role: z.enum(['EMPRESA', 'AGENTE', 'TRANSPORTISTA', 'ADMIN', 'SUPERADMIN']),
  }).parse(req.body);

  const user = await prisma.user.update({ where: { id: req.params.id }, data: { role: role as never } });
  await activityLogService.log(
    req.user!.userId, 'CHANGE_ROLE',
    `Cambió rol a ${role}`,
    { targetUserId: req.params.id, newRole: role },
    req.ip,
  );
  res.json({ success: true, data: { id: user.id, role: user.role } });
}));

// ── Activate / Deactivate ──────────────────────────────────────────────────
userRoutes.put('/:id/status', requireRole('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
  const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { isActive } });
  await activityLogService.log(
    req.user!.userId,
    isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
    `${isActive ? 'Activó' : 'Desactivó'} cuenta de usuario`,
    { targetUserId: req.params.id },
    req.ip,
  );
  res.json({ success: true, data: { id: user.id, isActive: user.isActive } });
}));

// ── Reset password ─────────────────────────────────────────────────────────
userRoutes.post('/:id/reset-password', requireRole('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const rand  = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const tempPassword = `Tmp${rand}!`;

  await prisma.user.update({
    where: { id: req.params.id },
    data:  { password: await bcrypt.hash(tempPassword, 12) },
  });
  await activityLogService.log(
    req.user!.userId, 'RESET_PASSWORD',
    'Contraseña reseteada por administrador',
    { targetUserId: req.params.id },
    req.ip,
  );
  res.json({ success: true, data: { tempPassword } });
}));

// ── Activity history ───────────────────────────────────────────────────────
userRoutes.get('/:id/history', requireRole('ADMIN', 'SUPERADMIN'), asyncHandler(async (req, res) => {
  const logs = await activityLogService.getByUser(req.params.id, 100);
  res.json({ success: true, data: logs });
}));
