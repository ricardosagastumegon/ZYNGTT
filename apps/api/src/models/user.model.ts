import { User, Company } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const userModel = {
  findByEmail: (email: string) =>
    prisma.user.findUnique({ where: { email }, include: { company: true } }),

  findById: (id: string) =>
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, companyId: true, company: true, createdAt: true,
      },
    }),

  create: (data: {
    email: string; password: string; firstName: string;
    lastName: string; companyName?: string;
  }) =>
    prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        ...(data.companyName && {
          company: { create: { name: data.companyName } },
        }),
      },
      include: { company: true },
    }),

  update: (id: string, data: Partial<Pick<User, 'firstName' | 'lastName' | 'phone'>>) =>
    prisma.user.update({ where: { id }, data }),

  saveRefreshToken: (userId: string, token: string, expiresAt: Date) =>
    prisma.refreshToken.upsert({
      where: { token },
      update: { userId, expiresAt },
      create: { userId, token, expiresAt },
    }),

  findRefreshToken: (token: string) =>
    prisma.refreshToken.findUnique({ where: { token }, include: { user: true } }),

  deleteRefreshToken: (token: string) =>
    prisma.refreshToken.deleteMany({ where: { token } }),

  deleteUserRefreshTokens: (userId: string) =>
    prisma.refreshToken.deleteMany({ where: { userId } }),
};
