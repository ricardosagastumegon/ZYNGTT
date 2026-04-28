import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, error: err.message });
  }

  if (err instanceof ZodError) {
    const message = err.errors.map(e => e.message).join(', ');
    return res.status(400).json({ success: false, error: message });
  }

  logger.error(err);
  return res.status(500).json({ success: false, error: 'Internal server error' });
}
