import { Worker } from 'bullmq';
import { prisma } from '../lib/prisma';
import { getConnection, enqueueSAT, enqueueSIGIE } from '../automation/automation-queue';
import { getCredentials } from '../utils/credentials-vault';
import { login, crearConstancia, consultarEstado, descargarPermiso } from '../automation/sigie-maga.bot';
import { uploadBuffer } from '../integrations/cloudinary';
import { logger } from '../utils/logger';

type Mercancia = { fraccion: string; cantidadKG: number; valorUSD?: number; nombre?: string; labRequerido?: boolean };

const redisOptions = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  maxRetriesPerRequest: null as null,
};

export const sigieWorker = new Worker(
  'sigie-jobs',
  async (job) => {
    const { type, expedienteId, permisoId } = job.data as {
      type?: string;
      expedienteId: string;
      permisoId?: string;
    };
    const jobType = type ?? job.name;

    logger.info(`SIGIE worker processing: ${jobType} for ${expedienteId}`);

    const exp = await prisma.importExpediente.findUnique({
      where: { id: expedienteId },
      include: { sigiePermisos: true },
    });
    if (!exp) throw new Error(`Expediente ${expedienteId} not found`);

    const creds = await getCredentials(exp.userId, 'SIGIE');
    if (!creds) throw new Error('No SIGIE credentials found for user');

    switch (jobType) {
      case 'CREATE_CONSTANCIA': {
        const mercancias = exp.mercancias as Mercancia[];

        // Ensure a SIGIEPermiso record exists per product
        for (const merc of mercancias) {
          const exists = exp.sigiePermisos.find(p => p.fraccionArancelaria === merc.fraccion);
          if (!exists) {
            await prisma.sIGIEPermiso.create({
              data: {
                expedienteId,
                producto: merc.nombre ?? merc.fraccion,
                fraccionArancelaria: merc.fraccion,
                pesoNetoKG: merc.cantidadKG,
                cantidadBultos: 1,
                tipoBulto: 'CAJA',
                numFactura: exp.cfdiFolio ?? undefined,
                numCertFitoMX: exp.fitoMXNumero ?? undefined,
                paisOrigen: 'MÉXICO',
              },
            });
          }
        }

        // Process first pending permiso
        const pending = await prisma.sIGIEPermiso.findFirst({
          where: { expedienteId, status: 'PENDIENTE' },
        });
        if (!pending) {
          logger.info(`All permisos already processed for ${expedienteId}`);
          break;
        }

        const page = await login(creds);
        const result = await crearConstancia(page, {
          impNIT: exp.impNIT ?? '',
          impNombre: exp.impNombre,
          expNombre: exp.expNombre,
          expRFC: exp.expRFC,
          producto: {
            descripcion: pending.producto,
            hsCode: pending.fraccionArancelaria ?? '',
            cantidadKG: pending.pesoNetoKG,
            valorUSD: exp.totalUSD,
            paisOrigen: 'Mexico',
          },
          fitoMXNumero: pending.numCertFitoMX ?? undefined,
          aduanaEntrada: exp.aduanaEntradaGT ?? 'ADUANA TECUN UMAN II',
          fechaEstimada: exp.fechaCruce ? new Date(exp.fechaCruce) : undefined,
        });
        await page.context().close().catch(() => {});

        if (result.success) {
          await prisma.sIGIEPermiso.update({
            where: { id: pending.id },
            data: { status: 'SOLICITADO', controlElectronico: result.solicitudNumero },
          });
          await prisma.importExpediente.update({
            where: { id: expedienteId },
            data: { sigieStatus: 'SOLICITADO', status: 'SIGIE_SOLICITADO' },
          });
          logger.info(`SIGIE constancia created: ${result.solicitudNumero}`);
        } else {
          throw new Error(result.errorMessage ?? 'SIGIE creation failed');
        }
        break;
      }

      case 'CHECK_STATUS': {
        const solicitados = await prisma.sIGIEPermiso.findMany({
          where: { expedienteId, status: 'SOLICITADO', controlElectronico: { not: null } },
        });

        for (const permiso of solicitados) {
          if (!permiso.controlElectronico) continue;
          const page = await login(creds);
          const statusResult = await consultarEstado(page, permiso.controlElectronico);
          await page.context().close().catch(() => {});

          if (statusResult.status === 'APROBADO') {
            await prisma.sIGIEPermiso.update({
              where: { id: permiso.id },
              data: { status: 'APROBADO' },
            });
            await enqueueSIGIE('DOWNLOAD_PERMIT', expedienteId, { permisoId: permiso.id });
          }
        }

        // If all permisos approved → advance expediente
        const all = await prisma.sIGIEPermiso.findMany({ where: { expedienteId } });
        if (all.length > 0 && all.every(p => p.status === 'APROBADO')) {
          await prisma.importExpediente.update({
            where: { id: expedienteId },
            data: { sigieStatus: 'APROBADO', status: 'SIGIE_APROBADO' },
          });
        }
        break;
      }

      case 'DOWNLOAD_PERMIT': {
        const targets = permisoId
          ? await prisma.sIGIEPermiso.findMany({ where: { id: permisoId } })
          : await prisma.sIGIEPermiso.findMany({
              where: { expedienteId, status: 'APROBADO', permisoFitoUrl: null },
            });

        for (const permiso of targets) {
          if (!permiso.controlElectronico) continue;
          const page = await login(creds);
          const buf = await descargarPermiso(page, permiso.controlElectronico);
          await page.context().close().catch(() => {});

          if (buf) {
            const upload = await uploadBuffer(
              buf,
              `axon/expedientes/${expedienteId}/sigie-${permiso.id}`,
              'raw',
            );
            await prisma.sIGIEPermiso.update({
              where: { id: permiso.id },
              data: { permisoFitoUrl: upload.secure_url },
            });
          }
        }

        await prisma.importExpediente.update({
          where: { id: expedienteId },
          data: { sigieAprobadoAt: new Date(), status: 'DUCA_LISTA' },
        });
        logger.info(`SIGIE permits downloaded for ${expedienteId}`);
        break;
      }
    }
  },
  { connection: redisOptions, concurrency: 2 },
);

sigieWorker.on('completed', (job) => logger.info(`SIGIE job ${job.id} completed`));
sigieWorker.on('failed', (job, err) => logger.error(`SIGIE job ${job?.id} failed: ${err.message}`));
