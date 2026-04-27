import { PrismaClient, DocumentType } from '@prisma/client';
import { uploadDocument, deleteDocument, getSignedUrl } from '../integrations/cloudinary';
import { AppError } from '../utils/AppError';

const prisma = new PrismaClient();

export const documentService = {
  async upload(shipmentId: string, file: Express.Multer.File, type: DocumentType, uploadedById: string) {
    const shipment = await prisma.shipment.findFirst({ where: { id: shipmentId, userId: uploadedById } });
    if (!shipment) throw new AppError('Shipment not found', 404);

    const filename = `${Date.now()}-${file.originalname.replace(/\s/g, '-')}`;
    const { url, publicId } = await uploadDocument(file.buffer, filename, shipmentId);

    return prisma.document.create({
      data: { shipmentId, uploadedById, type, name: file.originalname, url, publicId, size: file.size },
    });
  },

  async getByShipment(shipmentId: string, userId: string) {
    const shipment = await prisma.shipment.findFirst({ where: { id: shipmentId, userId } });
    if (!shipment) throw new AppError('Shipment not found', 404);
    return prisma.document.findMany({ where: { shipmentId }, orderBy: { createdAt: 'desc' } });
  },

  async delete(id: string, userId: string) {
    const doc = await prisma.document.findFirst({ where: { id, uploadedById: userId } });
    if (!doc) throw new AppError('Document not found', 404);
    await deleteDocument(doc.publicId);
    await prisma.document.delete({ where: { id } });
  },

  async getSignedUrl(id: string, userId: string) {
    const doc = await prisma.document.findFirst({ where: { id, shipment: { userId } } });
    if (!doc) throw new AppError('Document not found', 404);
    return getSignedUrl(doc.publicId);
  },
};
