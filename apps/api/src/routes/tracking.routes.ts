import { Router } from 'express';
import { z } from 'zod';
import { trackingService } from '../services/tracking.service';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { trackingLimiter } from '../middleware/rateLimiter';

export const trackingRoutes = Router();

// Endpoint público — devuelve solo status, location, estimatedArrival (sin IDs internos ni datos de cliente)
trackingRoutes.get('/public/:trackingNumber', trackingLimiter, asyncHandler(async (req, res) => {
  const data = await trackingService.trackPublic(req.params.trackingNumber);
  res.json({ success: true, data });
}));

// Todas las rutas de abajo requieren autenticación
trackingRoutes.use(authenticate);

trackingRoutes.get('/:trackingNumber', asyncHandler(async (req, res) => {
  const data = await trackingService.trackByNumber(req.params.trackingNumber);
  res.json({ success: true, data });
}));

trackingRoutes.get('/shipment/:shipmentId', asyncHandler(async (req, res) => {
  const events = await trackingService.getEvents(req.params.shipmentId, req.user!.userId);
  res.json({ success: true, data: events });
}));

trackingRoutes.post('/sync/:shipmentId', asyncHandler(async (req, res) => {
  const result = await trackingService.syncFromCarrier(req.params.shipmentId, req.user!.userId);
  res.json({ success: true, data: result });
}));

const manualEventSchema = z.object({
  status: z.string().min(1),
  description: z.string().min(1),
  location: z.string().optional(),
});

trackingRoutes.post('/manual/:shipmentId', asyncHandler(async (req, res) => {
  const { status, description, location } = manualEventSchema.parse(req.body);
  const event = await trackingService.addManualEvent(req.params.shipmentId, status, description, location);
  res.status(201).json({ success: true, data: event });
}));
