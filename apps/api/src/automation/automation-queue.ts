import { Queue, QueueOptions } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '../utils/logger';

const redisOptions = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  maxRetriesPerRequest: null,
};

let connection: IORedis | null = null;

function getConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(redisOptions);
    connection.on('error', (err) => logger.warn('Redis connection error', err));
  }
  return connection;
}

const queueOptions: QueueOptions = {
  connection: redisOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
};

export const sigieQueue = new Queue('sigie-jobs', queueOptions);
export const satQueue = new Queue('sat-jobs', {
  ...queueOptions,
  defaultJobOptions: {
    ...queueOptions.defaultJobOptions,
    backoff: { type: 'exponential', delay: 10000 },
  },
});

// Job types
export type SIGIEJobType = 'CREATE_CONSTANCIA' | 'CHECK_STATUS' | 'DOWNLOAD_PERMIT';
export type SATJobType = 'TRANSMIT_DUCA' | 'CHECK_SEMAFORO' | 'GENERATE_PAYMENT';

export async function enqueueSIGIE(type: SIGIEJobType, expedienteId: string, data?: object) {
  const jobId = `${type}-${expedienteId}`;
  const existing = await sigieQueue.getJob(jobId);
  if (existing && ['waiting', 'active', 'delayed'].includes(await existing.getState())) {
    logger.info(`SIGIE job ${jobId} already enqueued, skipping`);
    return existing;
  }
  return sigieQueue.add(type, { expedienteId, ...data }, { jobId });
}

export async function enqueueSAT(type: SATJobType, expedienteId: string, data?: object) {
  const jobId = `${type}-${expedienteId}`;
  const existing = await satQueue.getJob(jobId);
  if (existing && ['waiting', 'active', 'delayed'].includes(await existing.getState())) {
    logger.info(`SAT job ${jobId} already enqueued, skipping`);
    return existing;
  }
  return satQueue.add(type, { expedienteId, ...data }, { jobId });
}

export { getConnection };
