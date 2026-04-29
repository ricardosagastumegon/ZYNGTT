import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role.middleware';
import { asyncHandler } from '../middleware/asyncHandler';
import { z } from 'zod';

export const transportCatalogRoutes = Router();
transportCatalogRoutes.use(authenticate);

const empresaSchema = z.object({
  nombre: z.string().min(1),
  CAAT: z.string().min(1),
  telefono: z.string().optional(),
});

const pilotoSchema = z.object({
  nombre: z.string().min(1),
  numLicencia: z.string().min(1),
  tipoLicencia: z.string().optional(),
});

const cabezalSchema = z.object({
  placa: z.string().min(1),
  tarjetaCirculacion: z.string().optional(),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  anio: z.number().int().optional(),
});

const cajaSchema = z.object({
  placa: z.string().min(1),
  numEconomico: z.string().optional(),
  tarjetaCirculacion: z.string().optional(),
  tipo: z.enum(['SECA', 'REFRIGERADA']).default('SECA'),
});

// ── Empresas ──────────────────────────────────────────────────────────────────

transportCatalogRoutes.get('/empresas', asyncHandler(async (_req, res) => {
  const empresas = await prisma.transportEmpresa.findMany({
    where: { activo: true },
    include: {
      _count: { select: { pilotos: true, cabezales: true, cajas: true } },
    },
    orderBy: { nombre: 'asc' },
  });
  res.json({ success: true, data: empresas });
}));

transportCatalogRoutes.post('/empresas',
  requireRole('ADMIN', 'SUPERADMIN'),
  asyncHandler(async (req, res) => {
    const data = empresaSchema.parse(req.body);
    const empresa = await prisma.transportEmpresa.create({ data });
    res.status(201).json({ success: true, data: empresa });
  })
);

transportCatalogRoutes.put('/empresas/:id',
  requireRole('ADMIN', 'SUPERADMIN'),
  asyncHandler(async (req, res) => {
    const data = empresaSchema.partial().parse(req.body);
    const empresa = await prisma.transportEmpresa.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: empresa });
  })
);

transportCatalogRoutes.delete('/empresas/:id',
  requireRole('ADMIN', 'SUPERADMIN'),
  asyncHandler(async (req, res) => {
    await prisma.transportEmpresa.update({ where: { id: req.params.id }, data: { activo: false } });
    res.json({ success: true });
  })
);

// ── Pilotos ───────────────────────────────────────────────────────────────────

transportCatalogRoutes.get('/empresas/:id/pilotos', asyncHandler(async (req, res) => {
  const pilotos = await prisma.piloto.findMany({
    where: { empresaId: req.params.id, activo: true },
    orderBy: { nombre: 'asc' },
  });
  res.json({ success: true, data: pilotos });
}));

transportCatalogRoutes.post('/empresas/:id/pilotos',
  requireRole('ADMIN', 'SUPERADMIN', 'TRANSPORTISTA'),
  asyncHandler(async (req, res) => {
    const data = pilotoSchema.parse(req.body);
    const piloto = await prisma.piloto.create({ data: { ...data, empresaId: req.params.id } });
    res.status(201).json({ success: true, data: piloto });
  })
);

transportCatalogRoutes.put('/pilotos/:id',
  requireRole('ADMIN', 'SUPERADMIN', 'TRANSPORTISTA'),
  asyncHandler(async (req, res) => {
    const data = pilotoSchema.partial().parse(req.body);
    const piloto = await prisma.piloto.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: piloto });
  })
);

transportCatalogRoutes.delete('/pilotos/:id',
  requireRole('ADMIN', 'SUPERADMIN', 'TRANSPORTISTA'),
  asyncHandler(async (req, res) => {
    await prisma.piloto.update({ where: { id: req.params.id }, data: { activo: false } });
    res.json({ success: true });
  })
);

// ── Cabezales ─────────────────────────────────────────────────────────────────

transportCatalogRoutes.get('/empresas/:id/cabezales', asyncHandler(async (req, res) => {
  const cabezales = await prisma.cabezal.findMany({
    where: { empresaId: req.params.id, activo: true },
    orderBy: { placa: 'asc' },
  });
  res.json({ success: true, data: cabezales });
}));

transportCatalogRoutes.post('/empresas/:id/cabezales',
  requireRole('ADMIN', 'SUPERADMIN', 'TRANSPORTISTA'),
  asyncHandler(async (req, res) => {
    const data = cabezalSchema.parse(req.body);
    const cabezal = await prisma.cabezal.create({ data: { ...data, empresaId: req.params.id } });
    res.status(201).json({ success: true, data: cabezal });
  })
);

transportCatalogRoutes.put('/cabezales/:id',
  requireRole('ADMIN', 'SUPERADMIN', 'TRANSPORTISTA'),
  asyncHandler(async (req, res) => {
    const data = cabezalSchema.partial().parse(req.body);
    const cabezal = await prisma.cabezal.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: cabezal });
  })
);

transportCatalogRoutes.delete('/cabezales/:id',
  requireRole('ADMIN', 'SUPERADMIN', 'TRANSPORTISTA'),
  asyncHandler(async (req, res) => {
    await prisma.cabezal.update({ where: { id: req.params.id }, data: { activo: false } });
    res.json({ success: true });
  })
);

// ── Cajas ─────────────────────────────────────────────────────────────────────

transportCatalogRoutes.get('/empresas/:id/cajas', asyncHandler(async (req, res) => {
  const cajas = await prisma.caja.findMany({
    where: { empresaId: req.params.id, activo: true },
    orderBy: { placa: 'asc' },
  });
  res.json({ success: true, data: cajas });
}));

transportCatalogRoutes.post('/empresas/:id/cajas',
  requireRole('ADMIN', 'SUPERADMIN', 'TRANSPORTISTA'),
  asyncHandler(async (req, res) => {
    const data = cajaSchema.parse(req.body);
    const caja = await prisma.caja.create({ data: { ...data, empresaId: req.params.id } });
    res.status(201).json({ success: true, data: caja });
  })
);

transportCatalogRoutes.put('/cajas/:id',
  requireRole('ADMIN', 'SUPERADMIN', 'TRANSPORTISTA'),
  asyncHandler(async (req, res) => {
    const data = cajaSchema.partial().parse(req.body);
    const caja = await prisma.caja.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: caja });
  })
);

transportCatalogRoutes.delete('/cajas/:id',
  requireRole('ADMIN', 'SUPERADMIN', 'TRANSPORTISTA'),
  asyncHandler(async (req, res) => {
    await prisma.caja.update({ where: { id: req.params.id }, data: { activo: false } });
    res.json({ success: true });
  })
);
