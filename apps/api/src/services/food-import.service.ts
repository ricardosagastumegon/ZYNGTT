import { PrismaClient, FoodImportStatus } from '@prisma/client';
import { parseCFDI } from './cfdi-parser.service';
import {
  getMAGARequirements,
  calculateTributes,
  calculateCIFValue,
  getDocumentChecklist,
} from '../data/hs-maga-requirements';
import { AppError } from '../utils/AppError';
import { MAGARequirements } from '../types/cfdi.types';
import {
  loginSIGIE,
  createConstanciaVegetal,
  checkSIGIEStatus,
  closeSIGIEBrowser,
  SIGIEResult,
} from '../automation/sigie-maga.automation';

const prisma = new PrismaClient();

export interface CreateFoodImportInput {
  shipmentId: string;
  cfdiXml: string;
  incoterm?: string;
  freightCostUSD?: number;
  insuranceCostUSD?: number;
  importerNIT?: string;
  importerName?: string;
  pointOfEntry?: string;
  expectedArrivalDate?: string;
}

export interface FoodImportSummary {
  id: string;
  shipmentId: string;
  folio: string;
  exporterName: string;
  exporterRFC: string;
  importerName: string;
  hsCode: string;
  description: string;
  cifValueUSD: number;
  totalTributesUSD: number;
  status: string;
  maga: MAGARequirements;
  documents: ReturnType<typeof getDocumentChecklist>;
  createdAt: Date;
}

export const foodImportService = {
  async parseCFDIAndCreate(input: CreateFoodImportInput, userId: string) {
    const {
      shipmentId, cfdiXml, incoterm = 'FOB',
      freightCostUSD, insuranceCostUSD,
      importerNIT, importerName, pointOfEntry, expectedArrivalDate,
    } = input;

    const shipment = await prisma.shipment.findFirst({ where: { id: shipmentId, userId } });
    if (!shipment) throw new AppError('Shipment not found', 404);

    const existing = await prisma.foodImport.findFirst({ where: { shipmentId } });
    if (existing) throw new AppError('This shipment already has a food import record', 409);

    const cfdi = parseCFDI(cfdiXml);

    const hsCode = cfdi.hsCodeDetected;
    if (!hsCode) throw new AppError('Could not determine HS code from CFDI. Ensure ComercioExterior complement is present.', 422);

    const commercialValueUSD = cfdi.moneda === 'USD'
      ? cfdi.total
      : cfdi.total / (cfdi.tipoCambio || 17.5);

    const cifValue = calculateCIFValue(commercialValueUSD, incoterm, freightCostUSD, insuranceCostUSD);
    const tributes = calculateTributes(hsCode, cifValue);
    const maga = getMAGARequirements(hsCode);

    const record = await prisma.foodImport.create({
      data: {
        shipmentId,
        userId,
        cfdiData: cfdi as object,
        cfdiVersion: cfdi.version,
        cfdiFolio: cfdi.folio ?? '',
        cfdiSerie: cfdi.serie,
        cfdiFecha: cfdi.fecha,
        exporterRFC: cfdi.emisor.rfc,
        exporterName: cfdi.emisor.nombre,
        importerRFC: cfdi.receptor.rfc,
        importerNIT: importerNIT ?? '',
        importerName: importerName ?? cfdi.receptor.nombre,
        hsCode,
        productDescription: cfdi.conceptos[0]?.descripcion ?? '',
        commercialValueUSD,
        incoterm,
        freightCostUSD: freightCostUSD ?? 350,
        insuranceCostUSD: insuranceCostUSD ?? commercialValueUSD * 0.003,
        cifValueUSD: cifValue,
        cifValueGTQ: tributes.cifValueGTQ,
        daiRate: tributes.daiRate,
        daiAmountGTQ: tributes.daiAmount,
        ivaAmountGTQ: tributes.ivaAmount,
        totalTributesGTQ: tributes.totalTributes,
        exchangeRate: tributes.exchangeRate,
        requiresFitosanitario: maga.requiresFitosanitario,
        requiresZoosanitario: maga.requiresZoosanitario,
        requiresLab: maga.requiresLab,
        requiresQuarantine: maga.requiresQuarantine,
        quarantineDays: maga.quarantineDays,
        labType: maga.labType,
        estimatedProcessDays: maga.estimatedDays,
        pointOfEntry: pointOfEntry ?? 'Santo Tomás de Castilla',
        expectedArrivalDate: expectedArrivalDate ? new Date(expectedArrivalDate) : undefined,
        status: 'DRAFT',
      },
    });

    return {
      ...record,
      maga,
      documents: getDocumentChecklist(hsCode),
      tributes,
    };
  },

  async getFoodImport(id: string, userId: string) {
    const record = await prisma.foodImport.findFirst({ where: { id, userId } });
    if (!record) throw new AppError('Food import record not found', 404);

    const hsCode = record.hsCode;
    return {
      ...record,
      maga: getMAGARequirements(hsCode),
      documents: getDocumentChecklist(hsCode),
      tributes: {
        cifValueUSD: record.cifValueUSD,
        cifValueGTQ: record.cifValueGTQ,
        daiRate: record.daiRate,
        daiAmount: record.daiAmountGTQ,
        ivaBase: record.cifValueGTQ + record.daiAmountGTQ,
        ivaAmount: record.ivaAmountGTQ,
        totalTributes: record.totalTributesGTQ,
        exchangeRate: record.exchangeRate,
      },
    };
  },

  async listFoodImports(userId: string, page = 1, limit = 10) {
    const [items, total] = await Promise.all([
      prisma.foodImport.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { shipment: { select: { reference: true, status: true } } },
      }),
      prisma.foodImport.count({ where: { userId } }),
    ]);
    return { items, total, page, limit };
  },

  async updateStatus(id: string, userId: string, status: string, notes?: string) {
    const record = await prisma.foodImport.findFirst({ where: { id, userId } });
    if (!record) throw new AppError('Food import record not found', 404);

    return prisma.foodImport.update({
      where: { id },
      data: {
        status: status as FoodImportStatus,
        ...(notes && { observations: notes }),
        ...(status === 'SIGIE_SUBMITTED' && { sigieSubmittedAt: new Date() }),
        ...(status === 'LAB_APPROVED' && { labResult: 'APPROVED', labResultDate: new Date() }),
        ...(status === 'RELEASED' && { releasedAt: new Date() }),
      },
    });
  },

  async saveSIGIERequestNumber(id: string, userId: string, sigieRequestNumber: string) {
    const record = await prisma.foodImport.findFirst({ where: { id, userId } });
    if (!record) throw new AppError('Food import record not found', 404);

    return prisma.foodImport.update({
      where: { id },
      data: { sigieRequestNumber, status: 'SIGIE_SUBMITTED', sigieSubmittedAt: new Date() },
    });
  },

  async generateSIGIEFormData(id: string, userId: string) {
    const record = await prisma.foodImport.findFirst({ where: { id, userId } });
    if (!record) throw new AppError('Food import record not found', 404);

    const maga = getMAGARequirements(record.hsCode);

    return {
      // Datos para pre-llenar formulario SIGIE
      tipoSolicitud: maga.processType === 'VEGETAL' ? 'CONSTANCIA_VEGETAL'
        : maga.processType === 'ANIMAL' ? 'CONSTANCIA_ANIMAL'
        : 'REGISTRO_ALIMENTOS',
      importador: {
        nit: record.importerNIT,
        nombre: record.importerName,
        rfcExportador: record.exporterRFC,
        nombreExportador: record.exporterName,
      },
      producto: {
        descripcion: record.productDescription,
        hsCode: record.hsCode,
        pais: 'MX',
        cantidadKg: (record.cfdiData as Record<string, unknown> as { comercioExterior?: { mercancias?: Array<{ kilogramosNetos?: number }> } })
          ?.comercioExterior?.mercancias?.[0]?.kilogramosNetos ?? 0,
        valorUSD: record.commercialValueUSD,
      },
      ingresoAduana: record.pointOfEntry,
      fechaEstimadaIngreso: record.expectedArrivalDate,
      documentos: getDocumentChecklist(record.hsCode).map(d => ({
        tipo: d.code,
        descripcion: d.label,
        requerido: d.required,
        completado: false,
      })),
      requisitosMaga: {
        fitosanitario: record.requiresFitosanitario,
        zoosanitario: record.requiresZoosanitario,
        lab: record.requiresLab,
        tipoLab: record.labType,
        cuarentena: record.requiresQuarantine,
        diasCuarentena: record.quarantineDays,
      },
    };
  },

  async recalculateTributes(
    id: string, userId: string,
    incoterm: string, freightCostUSD: number, insuranceCostUSD?: number,
  ) {
    const record = await prisma.foodImport.findFirst({ where: { id, userId } });
    if (!record) throw new AppError('Food import record not found', 404);

    const cifValue = calculateCIFValue(record.commercialValueUSD, incoterm, freightCostUSD, insuranceCostUSD);
    const tributes = calculateTributes(record.hsCode, cifValue);

    await prisma.foodImport.update({
      where: { id },
      data: {
        incoterm,
        freightCostUSD,
        insuranceCostUSD: insuranceCostUSD ?? record.commercialValueUSD * 0.003,
        cifValueUSD: cifValue,
        cifValueGTQ: tributes.cifValueGTQ,
        daiRate: tributes.daiRate,
        daiAmountGTQ: tributes.daiAmount,
        ivaAmountGTQ: tributes.ivaAmount,
        totalTributesGTQ: tributes.totalTributes,
      },
    });

    return tributes;
  },

  async checkLabRequirements(hsCode: string) {
    const maga = getMAGARequirements(hsCode);
    return {
      required: maga.requiresLab,
      labType: maga.labType,
      estimatedDays: maga.estimatedDays,
      notes: maga.notes,
    };
  },

  async submitToSIGIE(id: string, userId: string): Promise<SIGIEResult> {
    const record = await prisma.foodImport.findFirst({ where: { id, userId } });
    if (!record) throw new AppError('Food import record not found', 404);

    const sigieUser = process.env.SIGIE_USERNAME;
    const sigiePwd = process.env.SIGIE_PASSWORD;
    if (!sigieUser || !sigiePwd) {
      throw new AppError('SIGIE credentials not configured (SIGIE_USERNAME, SIGIE_PASSWORD)', 503);
    }

    const formData = await foodImportService.generateSIGIEFormData(id, userId);

    let page;
    try {
      page = await loginSIGIE({ username: sigieUser, password: sigiePwd });
      const result = await createConstanciaVegetal(page, {
        ...formData,
        fechaEstimadaIngreso: record.expectedArrivalDate ?? undefined,
      });

      if (result.success && result.requestNumber) {
        await prisma.foodImport.update({
          where: { id },
          data: {
            sigieRequestNumber: result.requestNumber,
            status: 'SIGIE_SUBMITTED',
            sigieSubmittedAt: new Date(),
          },
        });
      }

      return result;
    } finally {
      if (page) await page.context().close().catch(() => {});
    }
  },

  async syncSIGIEStatus(id: string, userId: string) {
    const record = await prisma.foodImport.findFirst({ where: { id, userId } });
    if (!record) throw new AppError('Food import record not found', 404);
    if (!record.sigieRequestNumber) throw new AppError('No SIGIE request number on record', 400);

    const sigieUser = process.env.SIGIE_USERNAME;
    const sigiePwd = process.env.SIGIE_PASSWORD;
    if (!sigieUser || !sigiePwd) throw new AppError('SIGIE credentials not configured', 503);

    let page;
    try {
      page = await loginSIGIE({ username: sigieUser, password: sigiePwd });
      const { status, observations } = await checkSIGIEStatus(page, record.sigieRequestNumber);

      const updatable = ['APPROVED', 'REJECTED', 'MAGA_REVIEW', 'RELEASED'];
      if (updatable.includes(status)) {
        await prisma.foodImport.update({
          where: { id },
          data: { status: status as never, ...(observations && { observations }) },
        });
      }

      return { status, observations };
    } finally {
      if (page) await page.context().close().catch(() => {});
    }
  },
};
