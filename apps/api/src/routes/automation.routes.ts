import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role.middleware';
import { asyncHandler } from '../middleware/asyncHandler';
import { saveCredentials } from '../utils/credentials-vault';
import { enqueueSIGIE, enqueueSAT, sigieQueue, satQueue } from '../automation/automation-queue';
import { getChecklist } from '../services/expediente-checklist.service';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const credsSchema = z.object({
  system: z.enum(['SIGIE', 'SAT']),
  username: z.string().min(1),
  password: z.string().min(1),
});

// POST /api/automation/credentials
router.post('/credentials',
  requireRole('EMPRESA', 'AGENTE', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const { system, username, password } = credsSchema.parse(req.body);
    await saveCredentials(req.user!.userId, system, username, password);
    res.json({ success: true, message: `Credenciales ${system} guardadas de forma segura` });
  })
);

// POST /api/automation/sigie/:id — Iniciar solicitud SIGIE
router.post('/sigie/:id',
  requireRole('EMPRESA', 'ADMIN', 'SUPERADMIN'),
  asyncHandler(async (req, res) => {
    const job = await enqueueSIGIE('CREATE_CONSTANCIA', req.params.id);
    res.json({ success: true, jobId: job?.id, message: 'Solicitud SIGIE encolada.' });
  })
);

// GET /api/automation/sigie/:id — Estado SIGIE del expediente
router.get('/sigie/:id', asyncHandler(async (req, res) => {
  const exp = await prisma.importExpediente.findFirst({
    where: { id: req.params.id },
    select: {
      sigieStatus: true,
      sigieAprobadoAt: true,
      sigiePermitUrl: true,
      status: true,
      sigiePermisos: {
        select: {
          id: true,
          producto: true,
          fraccionArancelaria: true,
          status: true,
          permisoFitoNumero: true,
          dictamenNumero: true,
          permisoFitoUrl: true,
          controlElectronico: true,
        },
      },
    },
  });
  if (!exp) return res.status(404).json({ success: false, error: 'Expediente no encontrado' });
  res.json({ success: true, data: exp });
}));

// GET /api/automation/checklist/:id — Checklist completo del expediente
router.get('/checklist/:id', asyncHandler(async (req, res) => {
  const checklist = await getChecklist(req.params.id);
  res.json({ success: true, data: checklist });
}));

// POST /api/automation/sat/:id — Transmitir DUCA-D (bloqueado por checklist)
router.post('/sat/:id',
  requireRole('AGENTE', 'ADMIN', 'SUPERADMIN'),
  asyncHandler(async (req, res) => {
    const checklist = await getChecklist(req.params.id);
    if (!checklist.readyForDuca) {
      const faltantes = checklist.items.filter(i => !i.ok).map(i => i.item);
      return res.status(403).json({
        success: false,
        error: 'No se puede transmitir la DUCA-D todavía.',
        missing: faltantes,
      });
    }
    const job = await enqueueSAT('TRANSMIT_DUCA', req.params.id);
    res.json({ success: true, jobId: job?.id, message: 'Transmisión DUCA-D encolada al SAT Guatemala.' });
  })
);

// GET /api/automation/sat/semaforo/:id
router.get('/sat/semaforo/:id', asyncHandler(async (req, res) => {
  const exp = await prisma.importExpediente.findFirst({
    where: { id: req.params.id },
    select: { satSemaforo: true, ducaDNumero: true, satOrdenNumero: true, satTransmitidaAt: true, satLiberadaAt: true, status: true },
  });
  if (!exp) return res.status(404).json({ success: false, error: 'Expediente no encontrado' });
  res.json({ success: true, data: exp });
}));

// GET /api/automation/jobs/:jobId
router.get('/jobs/:jobId', asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const [sigieJob, satJob] = await Promise.all([
    sigieQueue?.getJob(jobId),
    satQueue?.getJob(jobId),
  ]);
  const job = sigieJob ?? satJob;
  if (!job) return res.status(404).json({ success: false, error: 'Job no encontrado' });
  const state = await job.getState();
  res.json({ success: true, data: { id: job.id, name: job.name, state, progress: job.progress, failedReason: job.failedReason } });
}));

export default router;
