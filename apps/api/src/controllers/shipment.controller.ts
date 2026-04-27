import { Request, Response } from 'express';
import { z } from 'zod';
import { shipmentService } from '../services/shipment.service';

const updateStatusSchema = z.object({
  status: z.enum(['DRAFT', 'CONFIRMED', 'IN_TRANSIT', 'AT_CUSTOMS', 'DELIVERED', 'CANCELLED']),
  notes: z.string().optional(),
});

export const shipmentController = {
  async list(req: Request, res: Response) {
    const { status, mode, type, page } = req.query as Record<string, string>;
    const result = await shipmentService.getShipments(req.user!.userId, { status, mode, type }, parseInt(page) || 1);
    res.json({ success: true, data: result });
  },

  async getById(req: Request, res: Response) {
    const shipment = await shipmentService.getShipmentById(req.params.id, req.user!.userId);
    res.json({ success: true, data: shipment });
  },

  async updateStatus(req: Request, res: Response) {
    const { status, notes } = updateStatusSchema.parse(req.body);
    const shipment = await shipmentService.updateStatus(req.params.id, req.user!.userId, status, notes);
    res.json({ success: true, data: shipment, message: 'Status updated' });
  },

  async cancel(req: Request, res: Response) {
    await shipmentService.cancelShipment(req.params.id, req.user!.userId);
    res.json({ success: true, message: 'Shipment cancelled' });
  },
};
