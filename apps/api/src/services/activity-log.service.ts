import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const activityLogService = {
  async log(
    userId: string,
    action: string,
    description: string,
    metadata?: Record<string, unknown>,
    ip?: string,
  ): Promise<void> {
    try {
      await prisma.activityLog.create({ data: { userId, action, description, metadata: metadata as Prisma.InputJsonValue | undefined, ip } });
    } catch { /* non-critical — never fail the parent request */ }
  },

  getByUser(userId: string, limit = 100) {
    return prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },
};
