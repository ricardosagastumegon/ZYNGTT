import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const adminStatsService = {
  async getStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalEmpresas, totalAgentes, totalTransportistas,
      totalExpedientes, expedientesActivos, expedientesLiberados,
      ultimaActividad,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'EMPRESA' } }),
      prisma.user.count({ where: { role: 'AGENTE' } }),
      prisma.user.count({ where: { role: 'TRANSPORTISTA' } }),
      prisma.importExpediente.count(),
      prisma.importExpediente.count({ where: { status: { notIn: ['LIBERADA', 'RECHAZADA'] } } }),
      prisma.importExpediente.count({ where: { status: 'LIBERADA', updatedAt: { gte: startOfMonth } } }),
      prisma.importExpediente.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: {
          id: true, status: true, expNombre: true, updatedAt: true,
          user: { select: { firstName: true, lastName: true, company: { select: { name: true } } } },
          shipment: { select: { reference: true } },
        },
      }),
    ]);

    return {
      totalEmpresas, totalAgentes, totalTransportistas,
      totalExpedientes, expedientesActivos, expedientesLiberados,
      ultimaActividad,
    };
  },
};
