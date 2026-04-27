import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

export const userRoutes = Router();

userRoutes.use(authenticate);
userRoutes.get('/me', asyncHandler(userController.me));
userRoutes.put('/profile', asyncHandler(userController.updateProfile));
