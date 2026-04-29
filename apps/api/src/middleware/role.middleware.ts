import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';


type AllowedRole = 'EMPRESA' | 'TRANSPORTISTA' | 'AGENTE' | 'ADMIN' | 'SUPERADMIN';

export function requireRole(...roles: AllowedRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new AppError('No autenticado', 401);
    if (!roles.includes(req.user.role as AllowedRole)) {
      throw new AppError(
        `Acceso denegado. Se requiere uno de los siguientes roles: ${roles.join(', ')}`,
        403
      );
    }
    next();
  };
}

export function requireSIGIEApproved(expedienteIdParam = 'id') {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const expedienteId = req.params[expedienteIdParam];
    if (!expedienteId) throw new AppError('ID de expediente requerido', 400);

    const expediente = await prisma.importExpediente.findUnique({
      where: { id: expedienteId },
      select: { sigieStatus: true },
    });

    if (!expediente) throw new AppError('Expediente no encontrado', 404);

    if (expediente.sigieStatus !== 'APROBADO') {
      throw new AppError(
        'Permiso MAGA pendiente. El agente no puede transmitir hasta que MAGA apruebe.',
        403
      );
    }

    next();
  };
}
