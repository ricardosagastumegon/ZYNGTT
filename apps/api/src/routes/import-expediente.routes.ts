import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role.middleware';
import { asyncHandler } from '../middleware/asyncHandler';
import { importExpedienteService } from '../services/import-expediente.service';
import multer from 'multer';
import { z } from 'zod';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const router = Router();

router.use(authenticate);

// POST /api/import/parse-cfdi — Parsear CFDI XML, crear Shipment + Expediente automáticamente
router.post('/parse-cfdi', upload.single('cfdi'), asyncHandler(async (req, res) => {
  if (!req.file) throw new Error('Archivo CFDI requerido');
  const data = await importExpedienteService.parseCFDIAndCreate(req.file.buffer, req.user!.userId);
  res.status(201).json({ success: true, data });
}));

// POST /api/import/transport/:id — Agregar datos de transporte
const transportSchema = z.object({
  transporteEmpresaId: z.string().optional(),
  pilotoId: z.string().optional(),
  cabezalId: z.string().optional(),
  cajaId: z.string().optional(),
  origenDireccion: z.string().optional(),
  origenCiudad: z.string().optional(),
  origenPais: z.string().optional(),
  destinoDireccion: z.string().optional(),
  destinoCiudad: z.string().optional(),
  destinoPais: z.string().optional(),
  fleteCosto: z.number().optional(),
  aduanaSalidaMX: z.string().optional(),
  aduanaEntradaGT: z.string().optional(),
  fechaCruce: z.string().optional(),
});

router.post('/transport/:id', asyncHandler(async (req, res) => {
  const data = transportSchema.parse(req.body);
  const result = await importExpedienteService.addTransportData(req.params.id, data, req.user!.userId);
  res.json({ success: true, data: result });
}));

// POST /api/import/generate-docs/:id — Generar PDFs y subir a Cloudinary
router.post('/generate-docs/:id', asyncHandler(async (req, res) => {
  const result = await importExpedienteService.generateDocuments(req.params.id, req.user!.userId);
  res.json({ success: true, data: result });
}));

// POST /api/import/fito-mx/:id — Subir fitosanitario MX
router.post('/fito-mx/:id', upload.single('fito'), asyncHandler(async (req, res) => {
  if (!req.file) throw new Error('Archivo requerido');
  const result = await importExpedienteService.uploadFitoMX(
    req.params.id, req.file.buffer, req.file.originalname, req.user!.userId,
    req.body.fitoMXNumero as string | undefined,
    req.body.fitoMXFecha as string | undefined,
  );
  res.json({ success: true, data: result });
}));

// POST /api/import/sigie-permiso/:id — Upsert SIGIEPermiso with form data
router.post('/sigie-permiso/:id', asyncHandler(async (req, res) => {
  const result = await importExpedienteService.upsertSIGIEPermiso(req.params.id, req.body, req.user!.userId);
  res.json({ success: true, data: result });
}));

// POST /api/import/lab/:id — Subir resultado de laboratorio
router.post('/lab/:id', upload.single('lab'), asyncHandler(async (req, res) => {
  if (!req.file) throw new Error('Archivo requerido');
  const result = await importExpedienteService.uploadLab(req.params.id, req.file.buffer, req.user!.userId);
  res.json({ success: true, data: result });
}));

// GET /api/import/list — Listar expedientes (paginado)
router.get('/list', asyncHandler(async (req, res) => {
  const page  = Math.max(1, Number(req.query.page  ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
  const result = await importExpedienteService.list(req.user!.userId, req.user!.role, page, limit);
  res.json({ success: true, ...result });
}));

// GET /api/import/:id/tributes — Recalcular tributos
router.get('/:id/tributes', asyncHandler(async (req, res) => {
  const data = await importExpedienteService.calculateTributes(req.params.id, req.user!.userId);
  res.json({ success: true, data });
}));

// GET /api/import/:id — Detalle completo del expediente
router.get('/:id', asyncHandler(async (req, res) => {
  const data = await importExpedienteService.getFullExpediente(req.params.id, req.user!.userId);
  res.json({ success: true, data });
}));

export default router;
