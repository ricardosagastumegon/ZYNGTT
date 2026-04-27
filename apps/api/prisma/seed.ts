import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('Test1234!', 12);

  const adminCompany = await prisma.company.create({ data: { name: 'ZYN Admin', country: 'GT' } });
  const clientCompany = await prisma.company.create({ data: { name: 'Importadora El Sol S.A.', taxId: '1234567-8', country: 'GT' } });

  const admin = await prisma.user.create({
    data: { email: 'admin@zyn.gt', password: hashedPassword, firstName: 'Admin', lastName: 'ZYN', role: 'ADMIN', companyId: adminCompany.id },
  });

  const client = await prisma.user.create({
    data: { email: 'cliente@empresa.gt', password: hashedPassword, firstName: 'Juan', lastName: 'Pérez', role: 'CLIENT', companyId: clientCompany.id },
  });

  const quote = await prisma.quote.create({
    data: { userId: client.id, type: 'IMPORT', mode: 'SEA', origin: 'Shanghai, China', destination: 'Puerto Quetzal, GT', weight: 5000, volume: 20, carrier: 'Maersk', price: 2800, currency: 'USD', transitDays: 28, validUntil: new Date(Date.now() + 7 * 86400000), status: 'CONVERTED' },
  });

  const shipments = await Promise.all([
    prisma.shipment.create({ data: { reference: 'ZYN-001', type: 'IMPORT', mode: 'SEA', status: 'DELIVERED', origin: 'Shanghai, China', destination: 'Puerto Quetzal, GT', carrier: 'Maersk', trackingNumber: 'MRKU1234567', weight: 5000, volume: 20, userId: client.id, quoteId: quote.id, estimatedDelivery: new Date(Date.now() - 5 * 86400000), actualDelivery: new Date(Date.now() - 3 * 86400000) } }),
    prisma.shipment.create({ data: { reference: 'ZYN-002', type: 'EXPORT', mode: 'AIR', status: 'IN_TRANSIT', origin: 'Guatemala City, GT', destination: 'Miami, FL, USA', carrier: 'DHL Express', trackingNumber: 'DHL9876543', weight: 200, userId: client.id, estimatedDelivery: new Date(Date.now() + 2 * 86400000) } }),
    prisma.shipment.create({ data: { reference: 'ZYN-003', type: 'IMPORT', mode: 'GROUND', status: 'AT_CUSTOMS', origin: 'Ciudad de México, MX', destination: 'Guatemala City, GT', carrier: 'Transporte CA', weight: 1200, userId: client.id, estimatedDelivery: new Date(Date.now() + 1 * 86400000) } }),
    prisma.shipment.create({ data: { reference: 'ZYN-004', type: 'IMPORT', mode: 'SEA', status: 'CONFIRMED', origin: 'Barcelona, Spain', destination: 'Santo Tomás, GT', carrier: 'Maersk', weight: 8000, volume: 40, userId: client.id, estimatedDelivery: new Date(Date.now() + 20 * 86400000) } }),
    prisma.shipment.create({ data: { reference: 'ZYN-005', type: 'EXPORT', mode: 'AIR', status: 'DRAFT', origin: 'Guatemala City, GT', destination: 'New York, NY, USA', weight: 50, userId: client.id } }),
  ]);

  await prisma.payment.create({
    data: { shipmentId: shipments[0].id, userId: client.id, amount: 2940, freightAmount: 2800, commissionAmount: 140, status: 'COMPLETED', paidAt: new Date(Date.now() - 10 * 86400000) },
  });
  await prisma.payment.create({
    data: { shipmentId: shipments[1].id, userId: client.id, amount: 955.5, freightAmount: 910, commissionAmount: 45.5, status: 'COMPLETED', paidAt: new Date(Date.now() - 2 * 86400000) },
  });
  await prisma.payment.create({
    data: { shipmentId: shipments[2].id, userId: client.id, amount: 577.5, freightAmount: 550, commissionAmount: 27.5, status: 'PENDING' },
  });

  await prisma.trackingEvent.createMany({
    data: [
      { shipmentId: shipments[0].id, status: 'delivered', description: 'Entregado al destinatario', location: 'Puerto Quetzal, GT', occurredAt: new Date(Date.now() - 3 * 86400000) },
      { shipmentId: shipments[0].id, status: 'in_transit', description: 'En tránsito hacia destino', location: 'Canal de Panamá', occurredAt: new Date(Date.now() - 10 * 86400000) },
      { shipmentId: shipments[0].id, status: 'in_transit', description: 'Salida de puerto de origen', location: 'Shanghai, China', occurredAt: new Date(Date.now() - 28 * 86400000) },
    ],
  });

  console.log('Seed completado.');
  console.log('Admin: admin@zyn.gt / Test1234!');
  console.log('Cliente: cliente@empresa.gt / Test1234!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
