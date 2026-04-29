import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const hash = (pw: string) => bcrypt.hash(pw, 12);

async function main() {
  console.log('🌱 Seeding database...');

  // ── Companies ───────────────────────────────────────────────────────────────

  const existingAjua = await prisma.company.findFirst({ where: { name: 'Agroindustria Ajua SA' } });
  const companyAjua = await prisma.company.upsert({
    where: { id: existingAjua?.id ?? 'none' },
    update: { taxId: '119397315' },
    create: { name: 'Agroindustria Ajua SA', taxId: '119397315', country: 'GT' },
  });

  const existingAgencia = await prisma.company.findFirst({ where: { name: 'Agencia Aduanal GT' } });
  const companyAgencia = await prisma.company.upsert({
    where: { id: existingAgencia?.id ?? 'none' },
    update: {},
    create: { name: 'Agencia Aduanal GT', taxId: '12345678', country: 'GT' },
  });

  // ── Transport Catalogs ───────────────────────────────────────────────────────

  const transportEmpresa = await prisma.transportEmpresa.upsert({
    where: { CAAT: 'TEST-CAAT-001' },
    update: {},
    create: { nombre: 'TRANSPORTES PERALTA', CAAT: 'TEST-CAAT-001' },
  });

  const piloto = await prisma.piloto.upsert({
    where: { id: 'seed-piloto-001' },
    update: {},
    create: {
      id: 'seed-piloto-001',
      empresaId: transportEmpresa.id,
      nombre: 'GUSTAVO ADOLFO GONZALEZ LIMATUJ',
      numLicencia: 'LIC-001',
      tipoLicencia: 'C',
    },
  });

  const cabezal = await prisma.cabezal.upsert({
    where: { placa: 'C-995CBP' },
    update: {},
    create: {
      empresaId: transportEmpresa.id,
      placa: 'C-995CBP',
      marca: 'Kenworth',
    },
  });

  const caja = await prisma.caja.upsert({
    where: { placa: 'TC-44BVY' },
    update: {},
    create: {
      empresaId: transportEmpresa.id,
      placa: 'TC-44BVY',
      numEconomico: '001',
      tipo: 'SECA',
    },
  });

  // ── Users ────────────────────────────────────────────────────────────────────

  await prisma.user.upsert({
    where: { email: 'super@axon.gt' },
    update: { password: await hash('super'), firstName: 'Super', lastName: 'Administrador', role: 'SUPERADMIN' },
    create: {
      email: 'super@axon.gt',
      password: await hash('super'),
      firstName: 'Super',
      lastName: 'Administrador',
      role: 'SUPERADMIN',
    },
  });

  const empresa = await prisma.user.upsert({
    where: { email: 'empresa@axon.gt' },
    update: { password: await hash('empresa'), firstName: 'Agroindustria', lastName: 'Ajua SA', companyId: companyAjua.id },
    create: {
      email: 'empresa@axon.gt',
      password: await hash('empresa'),
      firstName: 'Agroindustria',
      lastName: 'Ajua SA',
      role: 'EMPRESA',
      companyId: companyAjua.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'agente@axon.gt' },
    update: { password: await hash('agente'), firstName: 'Carlos', lastName: 'Agente Aduanal', companyId: companyAgencia.id },
    create: {
      email: 'agente@axon.gt',
      password: await hash('agente'),
      firstName: 'Carlos',
      lastName: 'Agente Aduanal',
      role: 'AGENTE',
      companyId: companyAgencia.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'transporte@axon.gt' },
    update: { password: await hash('transporte'), firstName: 'Transportes', lastName: 'Peralta' },
    create: {
      email: 'transporte@axon.gt',
      password: await hash('transporte'),
      firstName: 'Transportes',
      lastName: 'Peralta',
      role: 'TRANSPORTISTA',
    },
  });

  // ── Demo shipments ────────────────────────────────────────────────────────────

  const s1 = await prisma.shipment.upsert({
    where: { reference: 'ZYN-2024-001' },
    update: {},
    create: {
      reference: 'ZYN-2024-001',
      type: 'IMPORT', mode: 'GROUND', status: 'CONFIRMED',
      origin: 'Ciudad de Mexico, MX', destination: 'Ciudad de Guatemala, GT',
      userId: empresa.id,
    },
  });

  const s2 = await prisma.shipment.upsert({
    where: { reference: 'ZYN-2024-002' },
    update: {},
    create: {
      reference: 'ZYN-2024-002',
      type: 'IMPORT', mode: 'GROUND', status: 'IN_TRANSIT',
      origin: 'Guadalajara, MX', destination: 'Escuintla, GT',
      userId: empresa.id,
    },
  });

  const s3 = await prisma.shipment.upsert({
    where: { reference: 'ZYN-2024-003' },
    update: {},
    create: {
      reference: 'ZYN-2024-003',
      type: 'IMPORT', mode: 'GROUND', status: 'DELIVERED',
      origin: 'Monterrey, MX', destination: 'Coban, GT',
      userId: empresa.id,
    },
  });

  // ── Demo expedientes ──────────────────────────────────────────────────────────

  await prisma.importExpediente.upsert({
    where: { shipmentId: s1.id },
    update: {},
    create: {
      shipmentId: s1.id, userId: empresa.id,
      cfdiUUID: 'CFDI-001-2024', cfdiFolio: 'A1001',
      expNombre: 'Exportadora Mexico SA de CV', expRFC: 'EXM890101ABC',
      impNombre: companyAjua.name, impNIT: '119397315',
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
      expNombre: 'Agricola del Norte SA', expRFC: 'ANS920315XYZ',
      impNombre: companyAjua.name, impNIT: '119397315',
      incoterm: 'FOB', moneda: 'USD', totalUSD: 22000, pesoTotalKG: 8000,
      mercancias: [{ fraccion: '0702000000', nombre: 'TOMATE', cantidadKG: 8000, valorUSD: 22000 }],
      status: 'SIGIE_APROBADO', sigieStatus: 'APROBADO',
      transporteEmpresaId: transportEmpresa.id,
      pilotoId: piloto.id,
      cabezalId: cabezal.id,
      cajaId: caja.id,
    },
  });

  await prisma.importExpediente.upsert({
    where: { shipmentId: s3.id },
    update: {},
    create: {
      shipmentId: s3.id, userId: empresa.id,
      cfdiUUID: 'CFDI-003-2024', cfdiFolio: 'A1003',
      expNombre: 'Productora Verde SA', expRFC: 'PVS950820MNO',
      impNombre: companyAjua.name, impNIT: '119397315',
      incoterm: 'FOB', moneda: 'USD', totalUSD: 9500, pesoTotalKG: 3000,
      mercancias: [{ fraccion: '0704909999', nombre: 'COL / REPOLLO', cantidadKG: 3000, valorUSD: 9500 }],
      status: 'LIBERADA', sigieStatus: 'APROBADO',
    },
  });

  console.log('\n✅ Seed completado.\n');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('  👑 SuperAdmin:     super@axon.gt        /  super');
  console.log('  🏢 Empresa:        empresa@axon.gt       /  empresa');
  console.log('  🛃 Agente:         agente@axon.gt        /  agente');
  console.log('  🚛 Transportista:  transporte@axon.gt    /  transporte');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('  🚛 TransportEmpresa: TRANSPORTES PERALTA / TEST-CAAT-001');
  console.log('  👤 Piloto: GUSTAVO ADOLFO GONZALEZ LIMATUJ / LIC-001');
  console.log('  🚜 Cabezal: C-995CBP (Kenworth)');
  console.log('  📦 Caja: TC-44BVY / 001 / SECA');
  console.log('─────────────────────────────────────────────────────────────\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
