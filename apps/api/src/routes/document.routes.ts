import { Router } from 'express';
import { documentController } from '../controllers/document.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { upload } from '../middleware/upload';

export const documentRoutes = Router();
documentRoutes.use(authenticate);

documentRoutes.post('/upload/:shipmentId', upload.single('file'), asyncHandler(documentController.upload));
documentRoutes.get('/:shipmentId', asyncHandler(documentController.getByShipment));
documentRoutes.delete('/:id', asyncHandler(documentController.delete));
documentRoutes.get('/:id/view', asyncHandler(documentController.view));
