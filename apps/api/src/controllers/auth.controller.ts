import { Request, Response } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { AppError } from '../utils/AppError';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  companyName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authController = {
  async register(req: Request, res: Response) {
    const data = registerSchema.parse(req.body);
    const result = await authService.register(data);
    res.status(201).json({ success: true, data: result, message: 'Registration successful' });
  },

  async login(req: Request, res: Response) {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.login(email, password);
    res.json({ success: true, data: result, message: 'Login successful' });
  },

  async refresh(req: Request, res: Response) {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AppError('Refresh token required', 400);
    const result = await authService.refreshToken(refreshToken);
    res.json({ success: true, data: result });
  },

  async logout(req: Request, res: Response) {
    const { refreshToken } = req.body;
    if (refreshToken) await authService.logout(refreshToken);
    res.json({ success: true, message: 'Logged out' });
  },
};
