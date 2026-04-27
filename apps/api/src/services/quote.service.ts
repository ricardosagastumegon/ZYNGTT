import { PrismaClient, TransportMode, ShipmentType } from '@prisma/client';
import { getMaerskRates } from '../integrations/maersk';
import { getDHLRates } from '../integrations/dhl';
import { getGroundRates } from '../integrations/ground';
import { AppError } from '../utils/AppError';

const prisma = new PrismaClient();

interface CreateQuoteInput {
  type: ShipmentType;
  mode: TransportMode;
  origin: string;
  destination: string;
  weight: number;
  volume?: number;
  description?: string;
}

export const quoteService = {
  async createQuote(userId: string, data: CreateQuoteInput) {
    let rate;
    if (data.mode === 'SEA') rate = await getMaerskRates(data.origin, data.destination, data.weight, data.volume ?? 1);
    else if (data.mode === 'AIR') rate = await getDHLRates(data.origin, data.destination, data.weight);
    else rate = getGroundRates(data.origin, data.destination, data.weight);

    return prisma.quote.create({
      data: {
        userId,
        type: data.type,
        mode: data.mode,
        origin: data.origin,
        destination: data.destination,
        weight: data.weight,
        volume: data.volume,
        description: data.description,
        carrier: rate.carrier,
        price: rate.price,
        currency: rate.currency,
        transitDays: rate.transitDays,
        validUntil: rate.validUntil,
      },
    });
  },

  async getQuotes(userId: string, page = 1, limit = 10) {
    const [items, total] = await Promise.all([
      prisma.quote.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.quote.count({ where: { userId } }),
    ]);
    return { items, total, page, limit };
  },

  async getQuoteById(id: string, userId: string) {
    const quote = await prisma.quote.findFirst({ where: { id, userId } });
    if (!quote) throw new AppError('Quote not found', 404);
    return quote;
  },

  async convertToShipment(quoteId: string, userId: string) {
    const quote = await prisma.quote.findFirst({ where: { id: quoteId, userId } });
    if (!quote) throw new AppError('Quote not found', 404);
    if (quote.status === 'CONVERTED') throw new AppError('Quote already converted', 400);

    const reference = `ZYN-${Date.now()}`;

    const [shipment] = await prisma.$transaction([
      prisma.shipment.create({
        data: {
          reference,
          type: quote.type,
          mode: quote.mode,
          origin: quote.origin,
          destination: quote.destination,
          carrier: quote.carrier,
          weight: quote.weight,
          volume: quote.volume,
          description: quote.description,
          userId,
          quoteId: quote.id,
        },
      }),
      prisma.quote.update({ where: { id: quoteId }, data: { status: 'CONVERTED' } }),
    ]);

    return shipment;
  },
};
