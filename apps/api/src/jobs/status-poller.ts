import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { enqueueSIGIE, enqueueSAT } from '../automation/automation-queue';
import { logger } from '../utils/logger';

const INTERVAL = process.env.STATUS_POLL_INTERVAL ?? '5';

export function startStatusPoller() {
  const cronExpr = `*/${INTERVAL} * * * *`;
  logger.info(`Starting status poller with interval: every ${INTERVAL} minutes`);

  cron.schedule(cronExpr, async () => {
    try {
      await pollSIGIE();
      await pollSAT();
    } catch (err) {
      logger.error('Status poller error', err);
    }
  });
}

async function pollSIGIE() {
  try {
    const pending = await prisma.importExpediente.findMany({
      where: {
        sigieStatus: { in: ['SOLICITADO', 'EN_REVISION', 'RECIBIDA'] },
        sigiePermisos: { some: { status: 'SOLICITADO', controlElectronico: { not: null } } },
      },
      select: { id: true },
    });

    for (const { id } of pending) {
      await enqueueSIGIE('CHECK_STATUS', id);
    }

    if (pending.length > 0) {
      logger.info(`SIGIE poller: enqueued ${pending.length} status checks`);
    }
  } catch (err: any) {
    if (err.message?.includes('Redis not configured')) return;
    throw err;
  }
}

async function pollSAT() {
  try {
    const pending = await prisma.importExpediente.findMany({
      where: {
        status: 'DUCA_TRANSMITIDA',
        ducaDNumero: { not: null },
      },
      select: { id: true },
    });

    for (const { id } of pending) {
      await enqueueSAT('CHECK_SEMAFORO', id);
    }

    if (pending.length > 0) {
      logger.info(`SAT poller: enqueued ${pending.length} semáforo checks`);
    }
  } catch (err: any) {
    if (err.message?.includes('Redis not configured')) return;
    throw err;
  }
}
