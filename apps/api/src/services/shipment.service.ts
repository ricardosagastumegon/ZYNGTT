import { PrismaClient, ShipmentStatus } from '@prisma/client';
import { shipmentModel } from '../models/shipment.model';
import { AppError } from '../utils/AppError';

const prisma = new PrismaClient();

export const shipmentService = {
  async getShipments(userId: string, filters: Record<string, string>, page = 1, limit = 10) {
    const [items, total] = await shipmentModel.findAll(userId, filters, page, limit);
    return { items, total, page, limit };
  },

  async getShipmentById(id: string, userId: string) {
    const shipment = await shipmentModel.findById(id, userId);
    if (!shipment) throw new AppError('Shipment not found', 404);
    return shipment;
  },

  async updateStatus(id: string, userId: string, status: ShipmentStatus, notes?: string) {
    const existing = await prisma.shipment.findFirst({ where: { id, userId } });
    if (!existing) throw new AppError('Shipment not found', 404);
    const [updated] = await shipmentModel.updateStatus(id, status, notes);
    return updated;
  },

  async cancelShipment(id: string, userId: string) {
    const existing = await prisma.shipment.findFirst({ where: { id, userId } });
    if (!existing) throw new AppError('Shipment not found', 404);
    if (existing.status === 'DELIVERED') throw new AppError('Cannot cancel a delivered shipment', 400);
    return shipmentModel.cancel(id);
  },

  getStats: (userId: string) => shipmentModel.getStats(userId),
};
