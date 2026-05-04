import { Request, Response } from 'express';
import { z } from 'zod';
import { userModel } from '../models/user.model';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  companyName: z.string().min(1).optional(),
  companyTaxId: z.string().optional(),
  companyAddress: z.string().optional(),
  companyPhone: z.string().optional(),
});

export const userController = {
  async me(req: Request, res: Response) {
    const user = await userModel.findById(req.user!.userId);
    if (!user) throw new AppError('User not found', 404);
    res.json({ success: true, data: user });
  },

  async updateProfile(req: Request, res: Response) {
    const data = updateSchema.parse(req.body);
    const userId = req.user!.userId;

    const { companyName, companyTaxId, companyAddress, companyPhone, ...userFields } = data;

    const user = await userModel.update(userId, userFields);

    if (companyName !== undefined || companyTaxId !== undefined || companyAddress !== undefined || companyPhone !== undefined) {
      const existing = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } });
      if (existing?.companyId) {
        await prisma.company.update({
          where: { id: existing.companyId },
          data: {
            ...(companyName !== undefined && { name: companyName }),
            ...(companyTaxId !== undefined && { taxId: companyTaxId }),
            ...(companyAddress !== undefined && { address: companyAddress }),
            ...(companyPhone !== undefined && { phone: companyPhone }),
          },
        });
      } else if (companyName) {
        await prisma.company.create({
          data: {
            name: companyName,
            taxId: companyTaxId,
            address: companyAddress,
            phone: companyPhone,
            users: { connect: { id: userId } },
          },
        });
      }
    }

    const updated = await userModel.findById(userId);
    res.json({ success: true, data: updated, message: 'Perfil actualizado' });
  },
};
