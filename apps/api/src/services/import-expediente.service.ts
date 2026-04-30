import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { parseCFDI } from './cfdi-parser.service';
import { calcularTributos, getHSInfo, Mercancia } from '../data/hs-map';
import { generateCartaPorteMX, generateCartaPorteGT, generatePackingList } from './pdf-generator.service';
import { uploadBuffer } from '../integrations/cloudinary';
import { logger } from '../utils/logger';


interface TransportData {
  transporteEmpresaId?: string;
  pilotoId?: string;
  cabezalId?: string;
  cajaId?: string;
  origenDireccion?: string;
  origenCiudad?: string;
  origenPais?: string;
  destinoDireccion?: string;
  destinoCiudad?: string;
  destinoPais?: string;
  fleteCosto?: number;
  aduanaSalidaMX?: string;
  aduanaEntradaGT?: string;
  fechaCruce?: string;
}

function generateReference(): string {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `IMP-${ymd}-${rand}`;
}

export const importExpedienteService = {
  async parseCFDIAndCreate(xmlBuffer: Buffer, userId: string) {
    const cfdi = parseCFDI(xmlBuffer.toString('utf-8'));

    const mercancias: Mercancia[] = (cfdi.comercioExterior?.mercancias ?? []).map(m => ({
      fraccion: m.fraccionArancelaria ?? '',
      cantidadKG: m.kilogramosNetos ?? m.cantidadAduana ?? 0,
      valorUSD: m.valorDolares ?? 0,
      nombre: m.descripcionIngles,
    }));

    if (mercancias.length === 0 && cfdi.conceptos.length > 0) {
      mercancias.push({
        fraccion: cfdi.hsCodeDetected ?? '9999999999',
        cantidadKG: cfdi.conceptos.reduce((acc, c) => acc + c.cantidad, 0),
        valorUSD: cfdi.totalUSD ?? 0,
        nombre: cfdi.conceptos[0]?.descripcion,
      });
    }

    const pesoTotal = mercancias.reduce((acc, m) => acc + (m.cantidadKG ?? 0), 0);
    const totalUSD = cfdi.comercioExterior?.totalUSD ?? cfdi.totalUSD;
    const incoterm = cfdi.comercioExterior?.claveDePedimento === 'A1' ? 'FOB' : (cfdi.comercioExterior?.claveDePedimento ?? 'FOB');
    const tributos = calcularTributos(mercancias, 350, incoterm, cfdi.tipoCambio ?? 7.75);
    const labReq = mercancias.some(m => getHSInfo(m.fraccion)?.requiereLabMX);

    // Auto-create a draft Shipment from CFDI data — user never needs to enter an ID
    let reference = generateReference();
    let attempts = 0;
    while (attempts < 5) {
      const exists = await prisma.shipment.findUnique({ where: { reference } });
      if (!exists) break;
      reference = generateReference();
      attempts++;
    }

    const shipment = await prisma.shipment.create({
      data: {
        reference,
        type: 'IMPORT',
        mode: 'GROUND',
        status: 'DRAFT',
        origin: 'México',
        destination: 'Guatemala',
        description: mercancias[0]?.nombre ?? cfdi.conceptos[0]?.descripcion ?? 'Importación MX→GT',
        weight: pesoTotal || undefined,
        userId,
      },
    });

    const expediente = await prisma.importExpediente.create({
      data: {
        shipmentId: shipment.id,
        userId,
        cfdiUUID: cfdi.folio,
        cfdiFolio: cfdi.folio ?? '',
        expNombre: cfdi.emisor.nombre,
        expRFC: cfdi.emisor.rfc,
        impNombre: cfdi.receptor.nombre,
        impIdFiscal: cfdi.receptor.rfc,
        incoterm,
        moneda: cfdi.moneda ?? 'USD',
        tipoCambio: cfdi.tipoCambio,
        totalUSD: totalUSD ?? 0,
        mercancias: mercancias as object[],
        pesoTotalKG: pesoTotal,
        labRequerido: labReq,
        cifUSD: tributos.cifUSD,
        daiTotal: tributos.daiGTQ,
        ivaTotal: tributos.ivaGTQ,
        totalTributos: tributos.totalTributosGTQ,
        status: 'CFDI_PENDIENTE',
      },
    });

    return { ...expediente, shipment: { id: shipment.id, reference: shipment.reference } };
  },

  async addTransportData(id: string, data: TransportData, userId: string) {
    const exp = await prisma.importExpediente.findFirst({ where: { id, userId } });
    if (!exp) throw new AppError('Expediente no encontrado', 404);

    return prisma.importExpediente.update({
      where: { id },
      data: {
        ...data,
        fechaCruce: data.fechaCruce ? new Date(data.fechaCruce) : undefined,
        status: 'DOCS_GENERADOS',
      },
    });
  },

  async generateDocuments(id: string, userId: string) {
    const exp = await prisma.importExpediente.findFirst({
      where: { id, userId },
      include: {
        shipment: true,
        piloto: true,
        cabezal: true,
        caja: true,
        transporteEmpresa: true,
      },
    });
    if (!exp) throw new AppError('Expediente no encontrado', 404);
    if (!exp.pilotoId) throw new AppError('Datos de transporte incompletos — llena el Paso 2 primero', 400);

    const folder = `axon/expedientes/${id}`;
    const mercancias = exp.mercancias as { fraccion: string; cantidadKG: number; valorUSD?: number; nombre?: string; cantidadBultos?: number; tipoBulto?: string }[];

    logger.info(`Generating documents for expediente ${id}`);

    const expForPDF = {
      ...exp,
      mercancias,
      pesoTotalKG: exp.pesoTotalKG,
      impNIT: exp.impNIT ?? undefined,
      impDireccion: exp.impDireccion ?? undefined,
      // Map catalog relations to string fields expected by PDF generator
      pilotoNombre: exp.piloto?.nombre ?? undefined,
      pilotoLicencia: exp.piloto?.numLicencia ?? undefined,
      cabezalPlaca: exp.cabezal?.placa ?? undefined,
      furgonPlaca: exp.caja?.placa ?? undefined,
      numEconomico: exp.caja?.numEconomico ?? undefined,
      transporteEmpresa: exp.transporteEmpresa?.nombre ?? undefined,
      transporteCAAT: exp.transporteEmpresa?.CAAT ?? undefined,
      aduanaSalidaMX: exp.aduanaSalidaMX ?? undefined,
      aduanaEntradaGT: exp.aduanaEntradaGT ?? undefined,
      cartaPorteNum: exp.cartaPorteNum ?? undefined,
      manifiestoNum: exp.manifiestoNum ?? undefined,
      packingListNum: exp.packingListNum ?? undefined,
      fleteCosto: exp.fleteCosto ?? undefined,
      totalUSD: exp.totalUSD ?? undefined,
      fechaCruce: exp.fechaCruce ?? undefined,
    };
    const [mxBuf, gtBuf, plBuf] = await Promise.all([
      generateCartaPorteMX(expForPDF),
      generateCartaPorteGT(expForPDF),
      generatePackingList(expForPDF),
    ]);

    const [mxUpload, gtUpload, plUpload] = await Promise.all([
      uploadBuffer(mxBuf, `${folder}/carta-porte-mx`, 'raw'),
      uploadBuffer(gtBuf, `${folder}/carta-porte-gt`, 'raw'),
      uploadBuffer(plBuf, `${folder}/packing-list`, 'raw'),
    ]);

    return prisma.importExpediente.update({
      where: { id },
      data: {
        cartaPorteMXUrl: mxUpload.secure_url,
        cartaPorteGTUrl: gtUpload.secure_url,
        packingListUrl: plUpload.secure_url,
        status: 'DOCS_GENERADOS',
      },
    });
  },

  async uploadFitoMX(id: string, buffer: Buffer, filename: string, userId: string, fitoMXNumero?: string, fitoMXFecha?: string) {
    const exp = await prisma.importExpediente.findFirst({ where: { id, userId } });
    if (!exp) throw new AppError('Expediente no encontrado', 404);

    const upload = await uploadBuffer(buffer, `axon/expedientes/${id}/fito-mx`, 'raw');
    return prisma.importExpediente.update({
      where: { id },
      data: {
        fitoMXUrl: upload.secure_url,
        fitoMXNumero: fitoMXNumero || undefined,
        fitoMXFecha: fitoMXFecha ? new Date(fitoMXFecha) : undefined,
      },
    });
  },

  async upsertSIGIEPermiso(expedienteId: string, data: Record<string, unknown>, userId: string) {
    const exp = await prisma.importExpediente.findFirst({ where: { id: expedienteId, userId } });
    if (!exp) throw new AppError('Expediente no encontrado', 404);

    const fraccion = data.fraccionArancelaria as string;
    const existing = await prisma.sIGIEPermiso.findFirst({
      where: { expedienteId, fraccionArancelaria: fraccion },
    });

    const payload = {
      producto: data.producto as string,
      pesoNetoKG: Number(data.pesoNetoKG),
      cantidadBultos: Number(data.cantidadBultos) || 1,
      tipoBulto: (data.tipoBulto as string) || 'CAJA',
      licenciaSanitaria: (data.licenciaSanitaria as string) || undefined,
      temperatura: (data.temperatura as string) || undefined,
      numCertFitoMX: (data.numCertFitoMX as string) || undefined,
      numFactura: (data.numFactura as string) || undefined,
      numLote: (data.numLote as string) || undefined,
      numCertInocuidad: (data.numCertInocuidad as string) || undefined,
      numAnalisisLab: (data.numAnalisisLab as string) || undefined,
      status: 'PENDIENTE',
    };

    if (existing) {
      return prisma.sIGIEPermiso.update({ where: { id: existing.id }, data: payload });
    }
    return prisma.sIGIEPermiso.create({
      data: { expedienteId, fraccionArancelaria: fraccion, paisOrigen: 'MÉXICO', ...payload },
    });
  },

  async uploadLab(id: string, buffer: Buffer, userId: string) {
    const exp = await prisma.importExpediente.findFirst({ where: { id, userId } });
    if (!exp) throw new AppError('Expediente no encontrado', 404);

    const upload = await uploadBuffer(buffer, `axon/expedientes/${id}/lab`, 'raw');
    return prisma.importExpediente.update({
      where: { id },
      data: { labUrl: upload.secure_url },
    });
  },

  async calculateTributes(id: string, userId: string) {
    const exp = await prisma.importExpediente.findFirst({ where: { id, userId } });
    if (!exp) throw new AppError('Expediente no encontrado', 404);

    const mercancias = exp.mercancias as unknown as Mercancia[];
    const tributos = calcularTributos(
      mercancias,
      exp.fleteCosto ?? 350,
      exp.incoterm,
      exp.tipoCambio ?? 7.75,
    );

    await prisma.importExpediente.update({
      where: { id },
      data: {
        cifUSD: tributos.cifUSD,
        daiTotal: tributos.daiGTQ,
        ivaTotal: tributos.ivaGTQ,
        totalTributos: tributos.totalTributosGTQ,
      },
    });

    return tributos;
  },

  async getFullExpediente(id: string, userId: string) {
    const exp = await prisma.importExpediente.findFirst({
      where: { id, userId },
      include: { shipment: { select: { reference: true, status: true } } },
    });
    if (!exp) throw new AppError('Expediente no encontrado', 404);
    return exp;
  },

  async list(userId: string, role: string, page = 1, limit = 20) {
    const where = ['AGENTE', 'ADMIN', 'SUPERADMIN'].includes(role) ? {} : { userId };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prisma.importExpediente.findMany({
        where,
        include: {
          shipment: { select: { reference: true, status: true } },
          user: { select: { firstName: true, lastName: true, company: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.importExpediente.count({ where }),
    ]);
    return { data, total, page, limit };
  },
};
