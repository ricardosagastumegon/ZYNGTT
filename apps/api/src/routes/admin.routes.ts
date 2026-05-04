import { Router } from 'express';
import axios from 'axios';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { stripe } from '../integrations/stripe';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role.middleware';
import { asyncHandler } from '../middleware/asyncHandler';
import { saveCredentials } from '../utils/credentials-vault';
import { AppError } from '../utils/AppError';



export const adminRoutes = Router();

adminRoutes.use(authenticate);
adminRoutes.use(requireRole('ADMIN', 'SUPERADMIN'));

// ── GET /api/admin/integrations/status ─────────────────────────────────────
adminRoutes.get('/integrations/status', asyncHandler(async (_req, res) => {
  const [sigieRes, satRes] = await Promise.allSettled([
    axios.get('https://sigie.maga.gob.gt', { timeout: 6000 }),
    axios.get('https://farm3.sat.gob.gt',   { timeout: 6000 }),
  ]);

  const isReachable = (r: PromiseSettledResult<unknown>) =>
    r.status === 'fulfilled' ||
    (r.status === 'rejected' && (r as PromiseRejectedResult).reason?.response?.status !== undefined);

  // Stripe
  let stripeOk = false;
  let stripeMode = 'unknown';
  let lastPayment = null;
  try {
    if (process.env.STRIPE_SECRET_KEY) {
      await stripe.balance.retrieve();
      stripeOk  = true;
      stripeMode = process.env.STRIPE_SECRET_KEY.startsWith('sk_live') ? 'Producción' : 'Test';
    }
  } catch { /* API key invalid or missing */ }

  lastPayment = await prisma.payment.findFirst({
    where: { status: 'COMPLETED' },
    orderBy: { paidAt: 'desc' },
    select: { amount: true, currency: true, paidAt: true },
  });

  // Supabase Storage
  let storageOk = false;
  const supabaseUrl = process.env.SUPABASE_URL ?? '';
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY ?? '';
  try {
    if (supabaseUrl && supabaseKey) {
      const r = await fetch(`${supabaseUrl}/storage/v1/bucket/axon-docs`, {
        headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey },
      });
      storageOk = r.ok;
    }
  } catch { /* ignore */ }

  const docCount = await prisma.document.count();

  // Agent/company credential counts
  const [sigieCredCount, satCredCount] = await Promise.all([
    prisma.userCredentials.count({ where: { system: 'SIGIE' } }),
    prisma.userCredentials.count({ where: { system: 'SAT'   } }),
  ]);

  res.json({
    success: true,
    data: {
      sigie:      { ok: isReachable(sigieRes), url: 'https://sigie.maga.gob.gt', credentialsCount: sigieCredCount },
      sat:        { ok: isReachable(satRes),   url: 'https://farm3.sat.gob.gt',  credentialsCount: satCredCount  },
      maersk:     { configured: !!process.env.MAERSK_API_KEY },
      dhl:        { configured: !!process.env.DHL_API_KEY },
      shipengine: { configured: !!process.env.SHIPENGINE_API_KEY },
      stripe:     { ok: stripeOk, mode: stripeMode, configured: !!process.env.STRIPE_SECRET_KEY, lastPayment },
      cloudinary: {
        configured:    !!(supabaseUrl && supabaseKey),
        ok:            storageOk,
        storageMB:     null,
        storageLimitMB:null,
        documentCount: docCount,
      },
    },
  });
}));

// ── Ping helpers ───────────────────────────────────────────────────────────
async function pingUrl(url: string) {
  try {
    await axios.get(url, { timeout: 8000 });
    return { ok: true, message: 'Accesible' };
  } catch (err: unknown) {
    const status = (err as { response?: { status: number } })?.response?.status;
    if (status !== undefined) return { ok: true,  message: `Responde HTTP ${status} (requiere autenticación)` };
    return             { ok: false, message: 'No se puede conectar' };
  }
}

adminRoutes.post('/integrations/sigie/test', asyncHandler(async (_req, res) => {
  const result = await pingUrl('https://sigie.maga.gob.gt');
  res.json({ success: true, data: result });
}));

adminRoutes.post('/integrations/sat/test', asyncHandler(async (_req, res) => {
  const result = await pingUrl('https://farm3.sat.gob.gt');
  res.json({ success: true, data: result });
}));

adminRoutes.post('/integrations/maersk/test', asyncHandler(async (_req, res) => {
  if (!process.env.MAERSK_API_KEY) {
    return res.json({ success: true, data: { ok: false, message: 'API Key no configurada' } });
  }
  try {
    await axios.get('https://api.maersk.com/maeu/rates', {
      headers: { 'Consumer-Key': process.env.MAERSK_API_KEY }, timeout: 8000,
    });
    res.json({ success: true, data: { ok: true, message: 'API Key válida' } });
  } catch (err: unknown) {
    const status = (err as { response?: { status: number } })?.response?.status;
    const ok = status !== undefined && status !== 401 && status !== 403;
    res.json({ success: true, data: { ok, message: ok ? `HTTP ${status}` : 'API Key inválida o servicio caído' } });
  }
}));

adminRoutes.post('/integrations/dhl/test', asyncHandler(async (_req, res) => {
  if (!process.env.DHL_API_KEY) {
    return res.json({ success: true, data: { ok: false, message: 'API Key no configurada' } });
  }
  try {
    await axios.get('https://express.api.dhl.com/mydhlapi/rates', {
      headers: { 'DHL-API-Key': process.env.DHL_API_KEY }, timeout: 8000,
    });
    res.json({ success: true, data: { ok: true, message: 'API Key válida' } });
  } catch (err: unknown) {
    const status = (err as { response?: { status: number } })?.response?.status;
    const ok = status !== undefined && status !== 401 && status !== 403;
    res.json({ success: true, data: { ok, message: ok ? `HTTP ${status}` : 'API Key inválida o servicio caído' } });
  }
}));

// ── Save credentials (SUPERADMIN only) ────────────────────────────────────
const credSchema = z.object({ username: z.string().min(1), password: z.string().min(1) });

adminRoutes.post('/credentials/sigie/:companyId', requireRole('SUPERADMIN'), asyncHandler(async (req, res) => {
  const { username, password } = credSchema.parse(req.body);
  const companyUser = await prisma.user.findFirst({
    where: { companyId: req.params.companyId, role: 'EMPRESA' },
  });
  if (!companyUser) throw new AppError('No se encontró usuario EMPRESA para esta compañía', 404);
  await saveCredentials(companyUser.id, 'SIGIE', username, password);
  res.json({ success: true, message: 'Credenciales SIGIE guardadas' });
}));

adminRoutes.post('/credentials/sat/:agentId', requireRole('SUPERADMIN'), asyncHandler(async (req, res) => {
  const { username, password } = credSchema.parse(req.body);
  const agent = await prisma.user.findUnique({ where: { id: req.params.agentId } });
  if (!agent || agent.role !== 'AGENTE') throw new AppError('Agente no encontrado', 404);
  await saveCredentials(agent.id, 'SAT', username, password);
  res.json({ success: true, message: 'Credenciales SAT guardadas' });
}));

// ── GET /api/admin/logs ────────────────────────────────────────────────────
adminRoutes.get('/logs', asyncHandler(async (req, res) => {
  const page  = Math.max(1, Number(req.query.page  ?? 1));
  const limit = Math.min(100, Number(req.query.limit ?? 50));

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { firstName: true, lastName: true, email: true, role: true } } },
    }),
    prisma.activityLog.count(),
  ]);
  res.json({ success: true, data: logs, total, page, limit });
}));
