import { Router } from 'express';
import { trackingService } from '../services/tracking.service';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

export const trackingRoutes = Router();

trackingRoutes.get('/:trackingNumber', asyncHandler(async (req, res) => {
  const data = await trackingService.trackByNumber(req.params.trackingNumber);
  res.json({ success: true, data });
}));

trackingRoutes.use(authenticate);

trackingRoutes.get('/shipment/:shipmentId', asyncHandler(async (req, res) => {
  const events = await trackingService.getEvents(req.params.shipmentId, req.user!.userId);
  res.json({ success: true, data: events });
}));

trackingRoutes.post('/sync/:shipmentId', asyncHandler(async (req, res) => {
  const result = await trackingService.syncFromCarrier(req.params.shipmentId, req.user!.userId);
  res.json({ success: true, data: result });
}));

trackingRoutes.post('/manual/:shipmentId', asyncHandler(async (req, res) => {
  const { status, description, location } = req.body;
  const event = await trackingService.addManualEvent(req.params.shipmentId, status, description, location);
  res.status(201).json({ success: true, data: event });
}));
