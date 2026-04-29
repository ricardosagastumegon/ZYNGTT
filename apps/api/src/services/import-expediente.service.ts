import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { parseCFDI } from './cfdi-parser.service';
import { calcularTributos, getHSInfo, Mercancia } from '../data/hs-map';
import { generateCartaPorteMX, generateCartaPorteGT, generatePackingList } from './pdf-generator.service';
import { uploadBuffer } from '../integrations/cloudinary';
import { logger } from '../utils/logger';


interface TransportData {
  transporteEmpresa?: string;
  transporteCAAT?: string;
  pilotoNombre?: string;
  pilotoLicencia?: string;
  cabezalPlaca?: string;
  cabezalTarjeta?: string;
  furgonPlaca?: string;
  furgonTarjeta?: string;
  numEconomico?: string;
  fleteCosto?: number;
  aduanaSalidaMX?: string;
  aduanaEntradaGT?: string;
  fechaCruce?: string;
}

export const importExpedienteService = {
  async parseCFDIAndCreate(shipmentId: string, xmlBuffer: Buffer, userId: string) {
    const shipment = await prisma.shipment.findFirst({ where: { id: shipmentId, userId } });
    if (!shipment) throw new AppError('Envío no encontrado', 404);

    const existing = await prisma.importExpediente.findUnique({ where: { shipmentId } });
    if (existing) throw new AppError('El expediente ya existe para este envío', 409);

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

    // Detect HS lab requirements
    const labReq = mercancias.some(m => getHSInfo(m.fraccion)?.requiereLabMX);

    const expediente = await prisma.importExpediente.create({
      data: {
        shipmentId,
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

    return expediente;
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
      include: { shipment: true },
    });
    if (!exp) throw new AppError('Expediente no encontrado', 404);
    if (!exp.pilotoNombre) throw new AppError('Datos de transporte incompletos — llena el Paso 2 primero', 400);

    const folder = `axon/expedientes/${id}`;
    const mercancias = exp.mercancias as { fraccion: string; cantidadKG: number; valorUSD?: number; nombre?: string; cantidadBultos?: number; tipoBulto?: string }[];

    logger.info(`Generating documents for expediente ${id}`);

    const expForPDF = {
      ...exp,
      mercancias,
      pesoTotalKG: exp.pesoTotalKG,
      // Prisma returns string|null; PDF types expect string|undefined
      impNIT: exp.impNIT ?? undefined,
      impDireccion: exp.impDireccion ?? undefined,
      pilotoNombre: exp.pilotoNombre ?? undefined,
      pilotoLicencia: exp.pilotoLicencia ?? undefined,
      cabezalPlaca: exp.cabezalPlaca ?? undefined,
      furgonPlaca: exp.furgonPlaca ?? undefined,
      numEconomico: exp.numEconomico ?? undefined,
      aduanaSalidaMX: exp.aduanaSalidaMX ?? undefined,
      aduanaEntradaGT: exp.aduanaEntradaGT ?? undefined,
      transporteEmpresa: exp.transporteEmpresa ?? undefined,
      transporteCAAT: exp.transporteCAAT ?? undefined,
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

  async uploadFitoMX(id: string, buffer: Buffer, filename: string, userId: string) {
    const exp = await prisma.importExpediente.findFirst({ where: { id, userId } });
    if (!exp) throw new AppError('Expediente no encontrado', 404);

    const upload = await uploadBuffer(buffer, `axon/expedientes/${id}/fito-mx`, 'raw');
    return prisma.importExpediente.update({
      where: { id },
      data: { fitoMXUrl: upload.secure_url },
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
