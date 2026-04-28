'use client';

import { FoodImportRecord } from '@/hooks/useFoodImport';

interface Props {
  record: FoodImportRecord;
}

const PROCESS_LABELS: Record<string, string> = {
  VEGETAL: 'Vegetal / Fitosanitario',
  ANIMAL: 'Animal / Zoosanitario',
  PROCESSED: 'Alimento Procesado',
  GRAIN: 'Granos / Cereales',
};

function Badge({ active, label }: { active: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
      active ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-red-500' : 'bg-gray-400'}`} />
      {label}
    </span>
  );
}

export function MAGARequirementsCard({ record }: Props) {
  const processLabel = record.maga?.processType ? PROCESS_LABELS[record.maga.processType] : '—';

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Requisitos MAGA</h3>
        <span className="rounded-full bg-navy-100 px-2.5 py-0.5 text-xs font-medium text-navy-700">
          {processLabel}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge active={record.requiresFitosanitario} label="Fitosanitario" />
        <Badge active={record.requiresZoosanitario} label="Zoosanitario" />
        <Badge active={record.requiresLab} label={`Lab: ${record.labType ?? 'N/A'}`} />
        <Badge active={record.requiresQuarantine} label={`Cuarentena${record.quarantineDays ? ` ${record.quarantineDays}d` : ''}`} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-md bg-gray-50 p-3">
          <p className="text-xs text-gray-500">Tiempo estimado proceso</p>
          <p className="font-semibold text-gray-900 mt-0.5">{record.estimatedProcessDays} días hábiles</p>
        </div>
        <div className="rounded-md bg-gray-50 p-3">
          <p className="text-xs text-gray-500">Puerto de ingreso</p>
          <p className="font-semibold text-gray-900 mt-0.5">{record.pointOfEntry}</p>
        </div>
      </div>

      {record.maga?.notes && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          <p className="font-medium mb-1">Notas MAGA</p>
          <p className="text-xs">{record.maga.notes}</p>
        </div>
      )}
    </div>
  );
}
