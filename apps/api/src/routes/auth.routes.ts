import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { loginLimiter, registerLimiter } from '../middleware/rateLimiter';

export const authRoutes = Router();

authRoutes.post('/register', registerLimiter, asyncHandler(authController.register));
authRoutes.post('/login', loginLimiter, asyncHandler(authController.login));
authRoutes.post('/refresh', asyncHandler(authController.refresh));
authRoutes.post('/logout', asyncHandler(authController.logout));
