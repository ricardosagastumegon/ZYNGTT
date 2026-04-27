import { Router } from 'express';
import { quoteController } from '../controllers/quote.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

export const quoteRoutes = Router();
quoteRoutes.use(authenticate);

quoteRoutes.post('/', asyncHandler(quoteController.create));
quoteRoutes.get('/', asyncHandler(quoteController.list));
quoteRoutes.get('/:id', asyncHandler(quoteController.getById));
quoteRoutes.post('/:id/convert', asyncHandler(quoteController.convert));
