import { CustomsStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getRequirementsByHsCode, STANDARD_DOCS } from '../data/customs-requirements';
import { AppError } from '../utils/AppError';


export const customsService = {
  async createRecord(shipmentId: string, userId: string, data: { hsCode?: string; description?: string; value?: number; agent?: string }) {
    const shipment = await prisma.shipment.findFirst({ where: { id: shipmentId, userId } });
    if (!shipment) throw new AppError('Shipment not found', 404);

    const req = data.hsCode ? getRequirementsByHsCode(data.hsCode) : null;
    return prisma.customsRecord.upsert({
      where: { shipmentId },
      create: { shipmentId, ...data, tariffRate: req?.tariffRate },
      update: { ...data, tariffRate: req?.tariffRate },
    });
  },

  async getByShipment(shipmentId: string, userId: string) {
    const shipment = await prisma.shipment.findFirst({ where: { id: shipmentId, userId } });
    if (!shipment) throw new AppError('Shipment not found', 404);
    return prisma.customsRecord.findUnique({ where: { shipmentId } });
  },

  async updateStatus(id: string, status: CustomsStatus, observations?: string) {
    return prisma.customsRecord.update({ where: { id }, data: { status, observations } });
  },

  async generateChecklist(shipmentId: string, userId: string) {
    const record = await prisma.customsRecord.findFirst({ where: { shipmentId, shipment: { userId } } });
    const uploadedDocs = await prisma.document.findMany({ where: { shipmentId }, select: { type: true } });
    const uploadedTypes = uploadedDocs.map(d => d.type);

    const req = record?.hsCode ? getRequirementsByHsCode(record.hsCode) : null;
    const required = req?.requiredDocs ?? STANDARD_DOCS;

    return required.map(doc => ({ doc, uploaded: uploadedTypes.includes(doc as never), required: true }));
  },

  getRequirementsByHsCode: (hsCode: string) => ({ requirements: getRequirementsByHsCode(hsCode) }),
};

