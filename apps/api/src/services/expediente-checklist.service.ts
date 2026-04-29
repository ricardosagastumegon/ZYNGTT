import { prisma } from '../lib/prisma';

export interface ChecklistItem {
  item: string;
  ok: boolean;
  stage: 1 | 2 | 3;
  detail?: string;
}

export interface ChecklistResult {
  items: ChecklistItem[];
  stage1Complete: boolean;
  stage2Complete: boolean;
  readyForDuca: boolean;
}

export async function getChecklist(expedienteId: string): Promise<ChecklistResult> {
  const exp = await prisma.importExpediente.findUnique({
    where: { id: expedienteId },
    include: { sigiePermisos: true },
  });

  if (!exp) return { items: [], stage1Complete: false, stage2Complete: false, readyForDuca: false };

  const labOk = !exp.labRequerido || !!exp.labResultado;

  const stage1: ChecklistItem[] = [
    { stage: 1, item: 'CFDI subido',           ok: !!exp.cfdiXmlUrl },
    { stage: 1, item: 'Fito México subido',     ok: !!exp.fitoMXNumero },
    { stage: 1, item: 'Datos de transporte',    ok: !!(exp.pilotoId && exp.cabezalId) },
    { stage: 1, item: 'Lab (si aplica)',        ok: labOk },
    { stage: 1, item: 'Packing List generado',  ok: !!exp.packingListUrl },
    { stage: 1, item: 'Carta Porte MX generada', ok: !!exp.cartaPorteMXUrl },
    { stage: 1, item: 'Carta Porte GT generada', ok: !!exp.cartaPorteGTUrl },
  ];

  const stage2: ChecklistItem[] = exp.sigiePermisos.map(p => ({
    stage: 2 as const,
    item: `SIGIE ${p.producto}`,
    ok: p.status === 'APROBADO',
    detail: p.permisoFitoNumero && p.dictamenNumero
      ? `${p.permisoFitoNumero} / ${p.dictamenNumero}`
      : (p.permisoFitoNumero ?? undefined),
  }));

  const stage1Complete = stage1.every(i => i.ok);
  const stage2Complete = stage2.length > 0 && stage2.every(i => i.ok);
  const readyForDuca = stage1Complete && stage2Complete;

  const stage3: ChecklistItem[] = [
    { stage: 3, item: 'Listo para DUCA-D', ok: readyForDuca },
  ];

  return {
    items: [...stage1, ...stage2, ...stage3],
    stage1Complete,
    stage2Complete,
    readyForDuca,
  };
}
