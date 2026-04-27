import { Request, Response } from 'express';
import { z } from 'zod';
import { documentService } from '../services/document.service';
import { DocumentType } from '@prisma/client';

const typeSchema = z.nativeEnum(DocumentType);

export const documentController = {
  async upload(req: Request, res: Response) {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file provided' });
    const type = typeSchema.parse(req.body.type ?? 'OTHER');
    const doc = await documentService.upload(req.params.shipmentId, req.file, type, req.user!.userId);
    res.status(201).json({ success: true, data: doc });
  },

  async getByShipment(req: Request, res: Response) {
    const docs = await documentService.getByShipment(req.params.shipmentId, req.user!.userId);
    res.json({ success: true, data: docs });
  },

  async delete(req: Request, res: Response) {
    await documentService.delete(req.params.id, req.user!.userId);
    res.json({ success: true, message: 'Document deleted' });
  },

  async view(req: Request, res: Response) {
    const url = await documentService.getSignedUrl(req.params.id, req.user!.userId);
    res.redirect(url);
  },
};
