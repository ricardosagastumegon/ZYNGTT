import { prisma } from '../lib/prisma';
import { trackShipment } from '../integrations/shipengine';
import { AppError } from '../utils/AppError';


export const trackingService = {
  async getEvents(shipmentId: string, userId: string) {
    const shipment = await prisma.shipment.findFirst({ where: { id: shipmentId, userId } });
    if (!shipment) throw new AppError('Shipment not found', 404);
    return prisma.trackingEvent.findMany({ where: { shipmentId }, orderBy: { occurredAt: 'desc' } });
  },

  async trackByNumber(trackingNumber: string) {
    const shipment = await prisma.shipment.findFirst({ where: { trackingNumber } });
    if (!shipment) throw new AppError('Tracking number not found', 404);

    const events = await prisma.trackingEvent.findMany({
      where: { shipmentId: shipment.id },
      orderBy: { occurredAt: 'desc' },
      select: { status: true, location: true, description: true, occurredAt: true },
    });

    return { reference: shipment.reference, status: shipment.status, origin: shipment.origin, destination: shipment.destination, events };
  },

  async trackPublic(trackingNumber: string) {
    const shipment = await prisma.shipment.findFirst({
      where: { trackingNumber },
      select: { status: true, estimatedDelivery: true, trackingEvents: { orderBy: { occurredAt: 'desc' }, take: 1, select: { location: true, occurredAt: true } } },
    });
    if (!shipment) throw new AppError('Número de tracking no encontrado', 404);
    return {
      status: shipment.status,
      estimatedArrival: shipment.estimatedDelivery,
      lastLocation: shipment.trackingEvents[0]?.location ?? null,
      lastUpdate: shipment.trackingEvents[0]?.occurredAt ?? null,
    };
  },

  async addManualEvent(shipmentId: string, status: string, description: string, location?: string) {
    return prisma.trackingEvent.create({
      data: { shipmentId, status, description, location, occurredAt: new Date() },
    });
  },

  async syncFromCarrier(shipmentId: string, userId: string) {
    const shipment = await prisma.shipment.findFirst({ where: { id: shipmentId, userId } });
    if (!shipment || !shipment.trackingNumber || !shipment.carrier) {
      throw new AppError('Shipment has no tracking number or carrier', 400);
    }

    const events = await trackShipment(shipment.trackingNumber, shipment.carrier);
    if (!events.length) return { synced: 0 };

    await prisma.trackingEvent.createMany({
      data: events.map(e => ({ shipmentId, ...e })),
      skipDuplicates: true,
    });

    return { synced: events.length };
  },
};
