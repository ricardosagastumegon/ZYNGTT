import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { enqueueSIGIE, enqueueSAT } from '../automation/automation-queue';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();
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
  const pending = await prisma.importExpediente.findMany({
    where: {
      sigieStatus: { in: ['SOLICITADO', 'EN_REVISION', 'RECIBIDA'] },
      sigieNumSolicitud: { not: null },
    },
    select: { id: true },
  });

  for (const { id } of pending) {
    await enqueueSIGIE('CHECK_STATUS', id);
  }

  if (pending.length > 0) {
    logger.info(`SIGIE poller: enqueued ${pending.length} status checks`);
  }
}

async function pollSAT() {
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
}
