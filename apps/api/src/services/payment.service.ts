import { prisma } from '../lib/prisma';
import { createPaymentIntent, constructWebhookEvent, retrievePaymentIntent } from '../integrations/stripe';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

const COMMISSION_RATE = 0.05;

export const paymentService = {
  async initiatePayment(shipmentId: string, userId: string) {
    const shipment = await prisma.shipment.findFirst({ where: { id: shipmentId, userId }, include: { quote: true } });
    if (!shipment) throw new AppError('Shipment not found', 404);

    const existing = await prisma.payment.findUnique({ where: { shipmentId } });
    if (existing?.status === 'COMPLETED') throw new AppError('Shipment already paid', 400);

    const freightAmount = shipment.quote?.price ?? 1000;
    const commissionAmount = freightAmount * COMMISSION_RATE;
    const total = freightAmount + commissionAmount;

    const intent = await createPaymentIntent(total, 'USD', { shipmentId, userId });

    const payment = await prisma.payment.upsert({
      where: { shipmentId },
      create: { shipmentId, userId, amount: total, freightAmount, commissionAmount, stripePaymentIntentId: intent.id },
      update: { stripePaymentIntentId: intent.id, amount: total, freightAmount, commissionAmount },
    });

    return { payment, clientSecret: intent.client_secret };
  },

  async getPaymentHistory(userId: string) {
    return prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { shipment: { select: { reference: true, origin: true, destination: true } } },
    });
  },

  async getByShipment(shipmentId: string, userId: string) {
    const payment = await prisma.payment.findFirst({ where: { shipmentId, userId } });
    if (!payment) throw new AppError('Payment not found', 404);
    return payment;
  },

  async processWebhook(body: Buffer, signature: string) {
    const event = constructWebhookEvent(body, signature);
    logger.info('Stripe webhook', { type: event.type });

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as { id: string };
      await prisma.payment.updateMany({
        where: { stripePaymentIntentId: intent.id },
        data: { status: 'COMPLETED', paidAt: new Date() },
      });
    } else if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as { id: string };
      await prisma.payment.updateMany({
        where: { stripePaymentIntentId: intent.id },
        data: { status: 'FAILED' },
      });
    }
  },
};
