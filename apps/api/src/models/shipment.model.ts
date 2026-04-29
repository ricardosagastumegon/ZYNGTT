import { ShipmentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';


export const shipmentModel = {
  findById: (id: string, userId: string) =>
    prisma.shipment.findFirst({
      where: { id, userId },
      include: { documents: true, trackingEvents: { orderBy: { occurredAt: 'desc' } }, payment: true, customsRecord: true, statusHistory: { orderBy: { createdAt: 'asc' } }, quote: true },
    }),

  findAll: (userId: string, filters: { status?: ShipmentStatus; mode?: string; type?: string }, page: number, limit: number) =>
    Promise.all([
      prisma.shipment.findMany({
        where: { userId, ...(filters.status && { status: filters.status }), ...(filters.mode && { mode: filters.mode as never }), ...(filters.type && { type: filters.type as never }) },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { payment: { select: { status: true } } },
      }),
      prisma.shipment.count({ where: { userId } }),
    ]),

  updateStatus: (id: string, status: ShipmentStatus, notes?: string) =>
    prisma.$transaction([
      prisma.shipment.update({ where: { id }, data: { status } }),
      prisma.shipmentStatusHistory.create({ data: { shipmentId: id, status, notes } }),
    ]),

  cancel: (id: string) =>
    prisma.shipment.update({ where: { id }, data: { status: 'CANCELLED' } }),

  getStats: async (userId: string) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [active, completedMonth, payments, deliveredShipments] = await Promise.all([
      prisma.shipment.count({ where: { userId, status: { in: ['CONFIRMED', 'IN_TRANSIT', 'AT_CUSTOMS'] } } }),
      prisma.shipment.count({ where: { userId, status: 'DELIVERED', updatedAt: { gte: startOfMonth } } }),
      prisma.payment.aggregate({ where: { userId, status: 'COMPLETED', paidAt: { gte: startOfMonth } }, _sum: { amount: true } }),
      prisma.shipment.findMany({ where: { userId, status: 'DELIVERED', actualDelivery: { not: null }, estimatedDelivery: { not: null } }, select: { estimatedDelivery: true, actualDelivery: true } }),
    ]);

    const avgDays = deliveredShipments.length > 0
      ? Math.round(deliveredShipments.reduce((sum, s) => {
          const days = (s.actualDelivery!.getTime() - s.estimatedDelivery!.getTime()) / 86400000;
          return sum + Math.abs(days);
        }, 0) / deliveredShipments.length)
      : 7;

    return {
      activeShipments: active,
      completedThisMonth: completedMonth,
      spentThisMonth: payments._sum.amount ?? 0,
      avgDeliveryDays: avgDays,
    };
  },
};

