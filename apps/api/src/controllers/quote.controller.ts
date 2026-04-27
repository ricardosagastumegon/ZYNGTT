import { Request, Response } from 'express';
import { z } from 'zod';
import { quoteService } from '../services/quote.service';

const createSchema = z.object({
  type: z.enum(['IMPORT', 'EXPORT']),
  mode: z.enum(['SEA', 'AIR', 'GROUND']),
  origin: z.string().min(2),
  destination: z.string().min(2),
  weight: z.number().positive(),
  volume: z.number().positive().optional(),
  description: z.string().optional(),
});

export const quoteController = {
  async create(req: Request, res: Response) {
    const data = createSchema.parse(req.body);
    const quote = await quoteService.createQuote(req.user!.userId, data);
    res.status(201).json({ success: true, data: quote });
  },

  async list(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const result = await quoteService.getQuotes(req.user!.userId, page);
    res.json({ success: true, data: result });
  },

  async getById(req: Request, res: Response) {
    const quote = await quoteService.getQuoteById(req.params.id, req.user!.userId);
    res.json({ success: true, data: quote });
  },

  async convert(req: Request, res: Response) {
    const shipment = await quoteService.convertToShipment(req.params.id, req.user!.userId);
    res.json({ success: true, data: shipment, message: 'Quote converted to shipment' });
  },
};
