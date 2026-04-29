import { logger } from '../utils/logger';

const REDIS_ENABLED = !!(process.env.REDIS_HOST && process.env.REDIS_HOST !== 'localhost');

export type SIGIEJobType = 'CREATE_CONSTANCIA' | 'CHECK_STATUS' | 'DOWNLOAD_PERMIT';
export type SATJobType = 'TRANSMIT_DUCA' | 'CHECK_SEMAFORO' | 'GENERATE_PAYMENT';

let sigieQueue: any = null;
let satQueue: any = null;

if (REDIS_ENABLED) {
  const { Queue } = require('bullmq');
  const redisOptions = {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    maxRetriesPerRequest: null,
  };
  const queueOptions = {
    connection: redisOptions,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  };
  sigieQueue = new Queue('sigie-jobs', queueOptions);
  satQueue = new Queue('sat-jobs', {
    ...queueOptions,
    defaultJobOptions: { ...queueOptions.defaultJobOptions, backoff: { type: 'exponential', delay: 10000 } },
  });
  logger.info('BullMQ queues initialized');
} else {
  logger.warn('REDIS_HOST not configured — automation queues disabled');
}

export { sigieQueue, satQueue };

export function getConnection(): any {
  if (!REDIS_ENABLED) throw new Error('Automation queue not available (Redis not configured)');
  const IORedis = require('ioredis');
  return new IORedis({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    maxRetriesPerRequest: null,
  });
}

export async function enqueueSIGIE(type: SIGIEJobType, expedienteId: string, data?: object) {
  if (!sigieQueue) throw new Error('Automation queue not available (Redis not configured)');
  const jobId = `${type}-${expedienteId}`;
  const existing = await sigieQueue.getJob(jobId);
  if (existing && ['waiting', 'active', 'delayed'].includes(await existing.getState())) {
    logger.info(`SIGIE job ${jobId} already enqueued, skipping`);
    return existing;
  }
  return sigieQueue.add(type, { expedienteId, ...data }, { jobId });
}

export async function enqueueSAT(type: SATJobType, expedienteId: string, data?: object) {
  if (!satQueue) throw new Error('Automation queue not available (Redis not configured)');
  const jobId = `${type}-${expedienteId}`;
  const existing = await satQueue.getJob(jobId);
  if (existing && ['waiting', 'active', 'delayed'].includes(await existing.getState())) {
    logger.info(`SAT job ${jobId} already enqueued, skipping`);
    return existing;
  }
  return satQueue.add(type, { expedienteId, ...data }, { jobId });
}
