import { Request, Response } from 'express';
import { z } from 'zod';
import { userModel } from '../models/user.model';
import { AppError } from '../utils/AppError';

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
});

export const userController = {
  async me(req: Request, res: Response) {
    const user = await userModel.findById(req.user!.userId);
    if (!user) throw new AppError('User not found', 404);
    res.json({ success: true, data: user });
  },

  async updateProfile(req: Request, res: Response) {
    const data = updateSchema.parse(req.body);
    const user = await userModel.update(req.user!.userId, data);
    res.json({ success: true, data: user, message: 'Profile updated' });
  },
};
