import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { documentController } from '../controllers/document.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { upload } from '../middleware/upload';


export const documentRoutes = Router();
documentRoutes.use(authenticate);

// GET /api/documents — all docs for current user (across all their shipments)
documentRoutes.get('/', asyncHandler(async (req, res) => {
  const { userId, role } = req.user!;
  const where = ['ADMIN', 'SUPERADMIN'].includes(role)
    ? {}
    : { OR: [{ uploadedById: userId }, { shipment: { userId } }] };
  const docs = await prisma.document.findMany({
    where,
    include: { shipment: { select: { reference: true, status: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json({ success: true, data: docs });
}));

documentRoutes.post('/upload/:shipmentId', upload.single('file'), asyncHandler(documentController.upload));
documentRoutes.get('/:shipmentId', asyncHandler(documentController.getByShipment));
documentRoutes.delete('/:id', asyncHandler(documentController.delete));
documentRoutes.get('/:id/view', asyncHandler(documentController.view));
