import { Router } from 'express';
import { customsService } from '../services/customs.service';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

export const customsRoutes = Router();

customsRoutes.get('/requirements/:hsCode', asyncHandler(async (req, res) => {
  const data = customsService.getRequirementsByHsCode(req.params.hsCode);
  res.json({ success: true, data });
}));

customsRoutes.use(authenticate);

customsRoutes.post('/:shipmentId', asyncHandler(async (req, res) => {
  const data = await customsService.createRecord(req.params.shipmentId, req.user!.userId, req.body);
  res.status(201).json({ success: true, data });
}));

customsRoutes.get('/:shipmentId', asyncHandler(async (req, res) => {
  const data = await customsService.getByShipment(req.params.shipmentId, req.user!.userId);
  res.json({ success: true, data });
}));

customsRoutes.get('/:shipmentId/checklist', asyncHandler(async (req, res) => {
  const data = await customsService.generateChecklist(req.params.shipmentId, req.user!.userId);
  res.json({ success: true, data });
}));

customsRoutes.put('/:id/status', asyncHandler(async (req, res) => {
  const { status, observations } = req.body;
  const data = await customsService.updateStatus(req.params.id, status, observations);
  res.json({ success: true, data });
}));
