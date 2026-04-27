import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { asyncHandler } from '../middleware/asyncHandler';

export const authRoutes = Router();

authRoutes.post('/register', asyncHandler(authController.register));
authRoutes.post('/login', asyncHandler(authController.login));
authRoutes.post('/refresh', asyncHandler(authController.refresh));
authRoutes.post('/logout', asyncHandler(authController.logout));
