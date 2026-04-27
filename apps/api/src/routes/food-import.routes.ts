import { Router, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { foodImportService } from '../services/food-import.service';
import { AppError } from '../utils/AppError';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const createSchema = z.object({
  shipmentId: z.string().min(1),
  incoterm: z.enum(['EXW', 'FOB', 'CIF', 'CFR']).optional().default('FOB'),
  freightCostUSD: z.coerce.number().positive().optional(),
  insuranceCostUSD: z.coerce.number().positive().optional(),
  importerNIT: z.string().optional(),
  importerName: z.string().optional(),
  pointOfEntry: z.string().optional(),
  expectedArrivalDate: z.string().optional(),
});

const statusSchema = z.object({
  status: z.enum([
    'DRAFT', 'DOCUMENTS_PENDING', 'SIGIE_READY', 'SIGIE_SUBMITTED',
    'MAGA_REVIEW', 'LAB_PENDING', 'LAB_APPROVED', 'LAB_REJECTED',
    'QUARANTINE', 'APPROVED', 'RELEASED', 'REJECTED',
  ]),
  notes: z.string().optional(),
});

// POST /api/food-imports — upload CFDI XML + create record
router.post(
  '/',
  authenticate,
  upload.single('cfdi'),
  asyncHandler(async (req: Request, res: Response) => {
    const body = createSchema.parse(req.body);

    let cfdiXml: string;
    if (req.file) {
      cfdiXml = req.file.buffer.toString('utf-8');
    } else if (req.body.cfdiXml) {
      cfdiXml = req.body.cfdiXml;
    } else {
      throw new AppError('CFDI XML file or cfdiXml field is required', 400);
    }

    const result = await foodImportService.parseCFDIAndCreate(
      { ...body, cfdiXml },
      req.user!.id,
    );

    res.status(201).json({ success: true, data: result });
  }),
);

// GET /api/food-imports — list all for user
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const result = await foodImportService.listFoodImports(req.user!.id, page, limit);
    res.json({ success: true, data: result });
  }),
);

// GET /api/food-imports/:id — detail
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await foodImportService.getFoodImport(req.params.id, req.user!.id);
    res.json({ success: true, data: result });
  }),
);

// PATCH /api/food-imports/:id/status — update status
router.patch(
  '/:id/status',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { status, notes } = statusSchema.parse(req.body);
    const result = await foodImportService.updateStatus(req.params.id, req.user!.id, status, notes);
    res.json({ success: true, data: result });
  }),
);

// GET /api/food-imports/:id/sigie-form — get pre-filled SIGIE data
router.get(
  '/:id/sigie-form',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await foodImportService.generateSIGIEFormData(req.params.id, req.user!.id);
    res.json({ success: true, data: result });
  }),
);

// POST /api/food-imports/:id/sigie-number — save SIGIE request number after submission
router.post(
  '/:id/sigie-number',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { sigieRequestNumber } = z.object({ sigieRequestNumber: z.string().min(1) }).parse(req.body);
    const result = await foodImportService.saveSIGIERequestNumber(req.params.id, req.user!.id, sigieRequestNumber);
    res.json({ success: true, data: result });
  }),
);

// POST /api/food-imports/:id/recalculate — recalculate tributes with new CIF params
router.post(
  '/:id/recalculate',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      incoterm: z.enum(['EXW', 'FOB', 'CIF', 'CFR']),
      freightCostUSD: z.number().positive(),
      insuranceCostUSD: z.number().positive().optional(),
    });
    const { incoterm, freightCostUSD, insuranceCostUSD } = schema.parse(req.body);
    const result = await foodImportService.recalculateTributes(
      req.params.id, req.user!.id, incoterm, freightCostUSD, insuranceCostUSD,
    );
    res.json({ success: true, data: result });
  }),
);

// GET /api/food-imports/hs/:code/lab — check lab requirements for HS code
router.get(
  '/hs/:code/lab',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await foodImportService.checkLabRequirements(req.params.code);
    res.json({ success: true, data: result });
  }),
);

// POST /api/food-imports/:id/sigie-submit — automate SIGIE submission via Playwright
router.post(
  '/:id/sigie-submit',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await foodImportService.submitToSIGIE(req.params.id, req.user!.id);
    res.json({ success: result.success, data: result });
  }),
);

// POST /api/food-imports/:id/sigie-sync — sync status from SIGIE portal
router.post(
  '/:id/sigie-sync',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await foodImportService.syncSIGIEStatus(req.params.id, req.user!.id);
    res.json({ success: true, data: result });
  }),
);

export default router;
