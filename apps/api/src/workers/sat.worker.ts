import { Worker } from 'bullmq';
import { prisma } from '../lib/prisma';
import { getCredentials } from '../utils/credentials-vault';
import { login, transmitirDUCAD, consultarSemaforo, generarPago } from '../automation/sat-aduanas.bot';
import { logger } from '../utils/logger';


const redisOptions = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  maxRetriesPerRequest: null as null,
};

export const satWorker = new Worker(
  'sat-jobs',
  async (job) => {
    const { expedienteId } = job.data as { expedienteId: string };
    const jobType = job.name;

    logger.info(`SAT worker processing: ${jobType} for ${expedienteId}`);

    const exp = await prisma.importExpediente.findUnique({ where: { id: expedienteId } });
    if (!exp) throw new Error(`Expediente ${expedienteId} not found`);

    switch (jobType) {
      case 'TRANSMIT_DUCA': {
        // Block if SIGIE not approved
        if (exp.sigieStatus !== 'APROBADO') {
          throw new Error('SIGIE no aprobado. No se puede transmitir DUCA-D.');
        }

        const creds = await getCredentials(exp.userId, 'SAT');
        if (!creds) throw new Error('No SAT credentials found for user');

        const page = await login(creds);
        const mercancias = exp.mercancias as { fraccion: string; cantidadKG: number; valorUSD?: number; nombre?: string }[];

        const result = await transmitirDUCAD(page, {
          expedienteId,
          impNombre: exp.impNombre,
          impNIT: exp.impNIT ?? '',
          expNombre: exp.expNombre,
          expPais: 'Mexico',
          incoterm: exp.incoterm,
          fleteUSD: exp.fleteCosto ?? 350,
          seguroUSD: 0,
          cifUSD: exp.cifUSD ?? exp.totalUSD,
          mercancias: mercancias.map(m => ({
            fraccion: m.fraccion,
            descripcion: m.nombre ?? m.fraccion,
            paisOrigen: 'MX',
            cantidadKG: m.cantidadKG,
            valorCIF: (exp.cifUSD ?? exp.totalUSD) * (m.valorUSD ?? exp.totalUSD) / exp.totalUSD,
          })),
          documentUrls: {
            packingListUrl: exp.packingListUrl ?? undefined,
            cartaPorteUrl: exp.cartaPorteGTUrl ?? undefined,
            magaPermitUrl: exp.sigiePermitUrl ?? undefined,
            fitoMXUrl: exp.fitoMXUrl ?? undefined,
            labUrl: exp.labUrl ?? undefined,
          },
        });

        await page.context().close().catch(() => {});

        if (result.success) {
          await prisma.importExpediente.update({
            where: { id: expedienteId },
            data: {
              ducaDNumero: result.ducaNumero,
              satOrdenNumero: result.ordenSAT,
              satSemaforo: result.semaforo,
              satTransmitidaAt: new Date(),
              status: 'DUCA_TRANSMITIDA',
            },
          });
          logger.info(`SAT DUCA transmitida: ${result.ducaNumero}`);
        } else {
          throw new Error(result.errorMessage ?? 'SAT transmission failed');
        }
        break;
      }

      case 'CHECK_SEMAFORO': {
        if (!exp.ducaDNumero) return;

        const creds = await getCredentials(exp.userId, 'SAT');
        if (!creds) throw new Error('No SAT credentials found');

        const page = await login(creds);
        const semaforo = await consultarSemaforo(page, exp.ducaDNumero);
        await page.context().close().catch(() => {});

        const newStatus = semaforo === 'VERDE' ? 'SEMAFORO_VERDE' :
                          semaforo === 'ROJO' ? 'SEMAFORO_ROJO' : exp.status;

        await prisma.importExpediente.update({
          where: { id: expedienteId },
          data: {
            satSemaforo: semaforo,
            status: newStatus as never,
            satLiberadaAt: semaforo === 'VERDE' ? new Date() : undefined,
          },
        });

        logger.info(`SAT semáforo updated: ${semaforo} for ${expedienteId}`);
        break;
      }

      case 'GENERATE_PAYMENT': {
        if (!exp.satOrdenNumero) return;

        const creds = await getCredentials(exp.userId, 'SAT');
        if (!creds) throw new Error('No SAT credentials found');

        const page = await login(creds);
        const payment = await generarPago(page, exp.satOrdenNumero);
        await page.context().close().catch(() => {});

        if (payment) {
          logger.info(`SAT payment reference: ${payment.referencia}, amount: Q${payment.monto}`);
        }
        break;
      }
    }
  },
  {
    connection: redisOptions,
    concurrency: 2,
  }
);

satWorker.on('completed', (job) => logger.info(`SAT job ${job.id} completed`));
satWorker.on('failed', (job, err) => logger.error(`SAT job ${job?.id} failed: ${err.message}`));
