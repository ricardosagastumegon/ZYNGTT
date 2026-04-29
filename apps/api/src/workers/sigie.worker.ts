import { Worker } from 'bullmq';
import { prisma } from '../lib/prisma';
import { getConnection, enqueueSAT, enqueueSIGIE } from '../automation/automation-queue';
import { getCredentials } from '../utils/credentials-vault';
import { login, crearConstancia, consultarEstado, descargarPermiso } from '../automation/sigie-maga.bot';
import { uploadBuffer } from '../integrations/cloudinary';
import { logger } from '../utils/logger';


const redisOptions = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  maxRetriesPerRequest: null as null,
};

export const sigieWorker = new Worker(
  'sigie-jobs',
  async (job) => {
    const { type, expedienteId } = job.data as { type?: string; expedienteId: string };
    const jobType = type ?? job.name;

    logger.info(`SIGIE worker processing: ${jobType} for ${expedienteId}`);

    const exp = await prisma.importExpediente.findUnique({ where: { id: expedienteId } });
    if (!exp) throw new Error(`Expediente ${expedienteId} not found`);

    const creds = await getCredentials(exp.userId, 'SIGIE');
    if (!creds) throw new Error('No SIGIE credentials found for user');

    switch (jobType) {
      case 'CREATE_CONSTANCIA': {
        const page = await login(creds);
        const mercancias = exp.mercancias as { fraccion: string; cantidadKG: number; valorUSD?: number; nombre?: string }[];
        const firstMerc = mercancias[0];

        const result = await crearConstancia(page, {
          impNIT: exp.impNIT ?? '',
          impNombre: exp.impNombre,
          expNombre: exp.expNombre,
          expRFC: exp.expRFC,
          producto: {
            descripcion: firstMerc?.nombre ?? 'Producto agrícola',
            hsCode: firstMerc?.fraccion ?? '',
            cantidadKG: firstMerc?.cantidadKG ?? exp.pesoTotalKG,
            valorUSD: firstMerc?.valorUSD ?? exp.totalUSD,
            paisOrigen: 'Mexico',
          },
          fitoMXNumero: exp.fitoMXNumero ?? undefined,
          aduanaEntrada: exp.aduanaEntradaGT ?? 'ADUANA TECUN UMAN II',
          fechaEstimada: exp.fechaCruce ? new Date(exp.fechaCruce) : undefined,
        });

        await page.context().close().catch(() => {});

        if (result.success) {
          await prisma.importExpediente.update({
            where: { id: expedienteId },
            data: {
              sigieNumSolicitud: result.solicitudNumero,
              sigieStatus: 'SOLICITADO',
              status: 'SIGIE_SOLICITADO',
            },
          });
          logger.info(`SIGIE constancia created: ${result.solicitudNumero}`);
        } else {
          throw new Error(result.errorMessage ?? 'SIGIE creation failed');
        }
        break;
      }

      case 'CHECK_STATUS': {
        if (!exp.sigieNumSolicitud) return;

        const page = await login(creds);
        const status = await consultarEstado(page, exp.sigieNumSolicitud);
        await page.context().close().catch(() => {});

        const sigieStatus = status.status;
        const newStatus = sigieStatus === 'APROBADO' ? 'SIGIE_APROBADO' : exp.status;

        await prisma.importExpediente.update({
          where: { id: expedienteId },
          data: { sigieStatus, status: newStatus as never },
        });

        if (sigieStatus === 'APROBADO') {
          logger.info(`SIGIE approved for ${expedienteId}, downloading permit`);
          await enqueueSIGIE('DOWNLOAD_PERMIT', expedienteId);
        }
        break;
      }

      case 'DOWNLOAD_PERMIT': {
        if (!exp.sigieNumSolicitud) return;

        const page = await login(creds);
        const permitBuf = await descargarPermiso(page, exp.sigieNumSolicitud);
        await page.context().close().catch(() => {});

        if (permitBuf) {
          const upload = await uploadBuffer(permitBuf, `axon/expedientes/${expedienteId}/sigie-permit`, 'raw');
          await prisma.importExpediente.update({
            where: { id: expedienteId },
            data: {
              sigiePermitUrl: upload.secure_url,
              sigieAprobadoAt: new Date(),
              status: 'DUCA_LISTA',
            },
          });
          logger.info(`SIGIE permit downloaded and stored for ${expedienteId}`);
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

sigieWorker.on('completed', (job) => logger.info(`SIGIE job ${job.id} completed`));
sigieWorker.on('failed', (job, err) => logger.error(`SIGIE job ${job?.id} failed: ${err.message}`));
