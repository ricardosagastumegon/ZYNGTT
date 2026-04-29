import { prisma } from '../lib/prisma';


export const statsService = {
  async getDashboardStats(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [activeShipments, completedThisMonth, spentThisMonth, byStatusRaw, lastShipments, monthlyRaw] = await Promise.all([
      prisma.shipment.count({ where: { userId, status: { in: ['CONFIRMED', 'IN_TRANSIT', 'AT_CUSTOMS'] } } }),
      prisma.shipment.count({ where: { userId, status: 'DELIVERED', updatedAt: { gte: startOfMonth } } }),
      prisma.payment.aggregate({ where: { userId, status: 'COMPLETED', paidAt: { gte: startOfMonth } }, _sum: { amount: true } }),
      prisma.shipment.groupBy({ by: ['status'], where: { userId }, _count: { id: true } }),
      prisma.shipment.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, reference: true, origin: true, destination: true, carrier: true, status: true, createdAt: true } }),
      prisma.shipment.findMany({ where: { userId, createdAt: { gte: sixMonthsAgo } }, select: { createdAt: true } }),
    ]);

    const byStatus = byStatusRaw.map(s => ({ status: s.status, count: s._count.id }));

    const monthlyCounts: Record<string, number> = {};
    monthlyRaw.forEach(s => {
      const key = `${s.createdAt.getFullYear()}-${String(s.createdAt.getMonth() + 1).padStart(2, '0')}`;
      monthlyCounts[key] = (monthlyCounts[key] ?? 0) + 1;
    });
    const monthly = Object.entries(monthlyCounts).map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month));

    return {
      activeShipments,
      completedThisMonth,
      spentThisMonth: spentThisMonth._sum.amount ?? 0,
      avgDeliveryDays: 7,
      byStatus,
      monthly,
      lastShipments,
    };
  },

  async getReport(userId: string, from: Date, to: Date) {
    return prisma.shipment.findMany({
      where: { userId, createdAt: { gte: from, lte: to } },
      include: { payment: { select: { amount: true, status: true } }, quote: { select: { price: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },
};
