import { Router, Request, Response } from 'express';
import { paymentService } from '../services/payment.service';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

export const paymentRoutes = Router();

paymentRoutes.post('/webhook', asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  await paymentService.processWebhook(req.body as Buffer, signature);
  res.json({ received: true });
}));

paymentRoutes.use(authenticate);

paymentRoutes.post('/initiate/:shipmentId', asyncHandler(async (req, res) => {
  const data = await paymentService.initiatePayment(req.params.shipmentId, req.user!.userId);
  res.json({ success: true, data });
}));

paymentRoutes.get('/history', asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
  const data = await paymentService.getPaymentHistory(req.user!.userId, page, limit);
  res.json({ success: true, ...data });
}));

paymentRoutes.get('/:shipmentId', asyncHandler(async (req, res) => {
  const data = await paymentService.getByShipment(req.params.shipmentId, req.user!.userId);
  res.json({ success: true, data });
}));
