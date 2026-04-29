import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const hash = (pw: string) => bcrypt.hash(pw, 12);

  // ── Companies ──────────────���──────────────────────────────────────────────
  let companyAjua = await prisma.company.findFirst({ where: { name: 'Agroindustria Ajua SA' } });
  if (!companyAjua) {
    companyAjua = await prisma.company.create({
      data: { name: 'Agroindustria Ajua SA', taxId: '1234567-8', country: 'GT' },
    });
  }

  // ── Users ──────────────────────────��───────────────────────────────────���───
  const superadmin = await prisma.user.upsert({
    where: { email: 'admin@axon.gt' },
    update: {},
    create: {
      email: 'admin@axon.gt',
      password: await hash('Admin1234!'),
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPERADMIN',
    },
  });

  await prisma.user.upsert({
    where: { email: 'coordinador@axon.gt' },
    update: {},
    create: {
      email: 'coordinador@axon.gt',
      password: await hash('Admin1234!'),
      firstName: 'Carlos',
      lastName: 'Coordinador',
      role: 'ADMIN',
    },
  });

  const empresa = await prisma.user.upsert({
    where: { email: 'empresa@ajua.gt' },
    update: {},
    create: {
      email: 'empresa@ajua.gt',
      password: await hash('Test1234!'),
      firstName: 'Ricardo',
      lastName: 'Ajua',
      role: 'EMPRESA',
      companyId: companyAjua.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'agente@axon.gt' },
    update: {},
    create: {
      email: 'agente@axon.gt',
      password: await hash('Test1234!'),
      firstName: 'María',
      lastName: 'González',
      role: 'AGENTE',
    },
  });

  await prisma.user.upsert({
    where: { email: 'transporte@axon.gt' },
    update: {},
    create: {
      email: 'transporte@axon.gt',
      password: await hash('Test1234!'),
      firstName: 'Juan',
      lastName: 'Ramírez',
      role: 'TRANSPORTISTA',
    },
  });

  // ── Shipments ───────────────────────────────────────────────────��──────────
  const s1 = await prisma.shipment.upsert({
    where: { reference: 'ZYN-2024-001' },
    update: {},
    create: {
      reference: 'ZYN-2024-001',
      type: 'IMPORT', mode: 'LAND', status: 'CONFIRMED',
      origin: 'Ciudad de México, MX', destination: 'Ciudad de Guatemala, GT',
      userId: empresa.id,
    },
  });

  const s2 = await prisma.shipment.upsert({
    where: { reference: 'ZYN-2024-002' },
    update: {},
    create: {
      reference: 'ZYN-2024-002',
      type: 'IMPORT', mode: 'LAND', status: 'IN_TRANSIT',
      origin: 'Guadalajara, MX', destination: 'Escuintla, GT',
      userId: empresa.id,
    },
  });

  const s3 = await prisma.shipment.upsert({
    where: { reference: 'ZYN-2024-003' },
    update: {},
    create: {
      reference: 'ZYN-2024-003',
      type: 'IMPORT', mode: 'LAND', status: 'DELIVERED',
      origin: 'Monterrey, MX', destination: 'Cobán, GT',
      userId: empresa.id,
    },
  });

  // ── Expedientes ────────────────────────��──────────────────────���────────────
  await prisma.importExpediente.upsert({
    where: { shipmentId: s1.id },
    update: {},
    create: {
      shipmentId: s1.id, userId: empresa.id,
      cfdiUUID: 'CFDI-001-2024', cfdiFolio: 'A1001',
      expNombre: 'Exportadora México SA de CV', expRFC: 'EXM890101ABC',
      impNombre: companyAjua.name,
      incoterm: 'FOB', moneda: 'USD', totalUSD: 15000, pesoTotalKG: 5000,
      mercancias: [{ fraccion: '0706100100', nombre: 'ZANAHORIA', cantidadKG: 5000, valorUSD: 15000 }],
      status: 'SIGIE_SOLICITADO', sigieStatus: 'PENDIENTE',
    },
  });

  await prisma.importExpediente.upsert({
    where: { shipmentId: s2.id },
    update: {},
    create: {
      shipmentId: s2.id, userId: empresa.id,
      cfdiUUID: 'CFDI-002-2024', cfdiFolio: 'A1002',
      expNombre: 'Agrícola del Norte SA', expRFC: 'ANS920315XYZ',
      impNombre: companyAjua.name,
      incoterm: 'FOB', moneda: 'USD', totalUSD: 22000, pesoTotalKG: 8000,
      mercancias: [{ fraccion: '0702000000', nombre: 'TOMATE', cantidadKG: 8000, valorUSD: 22000 }],
      status: 'SIGIE_APROBADO', sigieStatus: 'APROBADO',
      pilotoNombre: 'Pedro Ramírez', pilotoLicencia: 'L-12345',
      cabezalPlaca: 'P-123ABC', furgonPlaca: 'R-456DEF',
      aduanaSalidaMX: 'Suchiate II', aduanaEntradaGT: 'Tecún Umán II',
    },
  });

  await prisma.importExpediente.upsert({
    where: { shipmentId: s3.id },
    update: {},
    create: {
      shipmentId: s3.id, userId: empresa.id,
      cfdiUUID: 'CFDI-003-2024', cfdiFolio: 'A1003',
      expNombre: 'Productora Verde SA', expRFC: 'PVS950820MNO',
      impNombre: companyAjua.name,
      incoterm: 'FOB', moneda: 'USD', totalUSD: 9500, pesoTotalKG: 3000,
      mercancias: [{ fraccion: '0704909999', nombre: 'COL / REPOLLO', cantidadKG: 3000, valorUSD: 9500 }],
      status: 'LIBERADA', sigieStatus: 'APROBADO',
    },
  });

  console.log('\n✅ Seed completado.\n');
  console.log('── Usuarios de prueba ─────���────────────────────────────────');
  console.log('  👑 SuperAdmin:     admin@axon.gt           / Admin1234!');
  console.log('  🔑 Admin:          coordinador@axon.gt     / Admin1234!');
  console.log('  🏢 Empresa:        empresa@ajua.gt         / Test1234!');
  console.log('  🛃 Agente:         agente@axon.gt          / Test1234!');
  console.log('  🚛 Transportista:  transporte@axon.gt      / Test1234!');
  console.log('────────────────────────────────────────────────────────────\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
