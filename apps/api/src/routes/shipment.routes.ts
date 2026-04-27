import { Router } from 'express';
import { shipmentController } from '../controllers/shipment.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

export const shipmentRoutes = Router();
shipmentRoutes.use(authenticate);

shipmentRoutes.get('/', asyncHandler(shipmentController.list));
shipmentRoutes.get('/:id', asyncHandler(shipmentController.getById));
shipmentRoutes.put('/:id/status', asyncHandler(shipmentController.updateStatus));
shipmentRoutes.delete('/:id', asyncHandler(shipmentController.cancel));
