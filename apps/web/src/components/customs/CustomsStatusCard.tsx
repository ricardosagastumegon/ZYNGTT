const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING:   { label: 'Pendiente',      color: 'bg-yellow-100 text-yellow-700' },
  IN_REVIEW: { label: 'En revisión',    color: 'bg-blue-100 text-blue-700' },
  APPROVED:  { label: 'Aprobado',       color: 'bg-green-100 text-green-700' },
  REJECTED:  { label: 'Rechazado',      color: 'bg-red-100 text-red-700' },
  RELEASED:  { label: 'Liberado',       color: 'bg-emerald-100 text-emerald-700' },
};

interface CustomsRecord {
  status: string; hsCode?: string; value?: number; currency?: string;
  tariffRate?: number; agent?: string; observations?: string;
}

export function CustomsStatusCard({ record }: { record: CustomsRecord }) {
  const cfg = STATUS_CONFIG[record.status] ?? { label: record.status, color: 'bg-gray-100 text-gray-600' };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-700">Estado aduanero</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        {record.hsCode && <div><dt className="text-gray-400">Código HS</dt><dd className="font-mono font-medium">{record.hsCode}</dd></div>}
        {record.tariffRate !== undefined && <div><dt className="text-gray-400">Arancel</dt><dd className="font-medium">{record.tariffRate}%</dd></div>}
        {record.value && <div><dt className="text-gray-400">Valor declarado</dt><dd className="font-medium">${record.value.toFixed(2)} {record.currency}</dd></div>}
        {record.agent && <div><dt className="text-gray-400">Agente aduanero</dt><dd className="font-medium">{record.agent}</dd></div>}
      </dl>
      {record.observations && (
        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
          <p className="font-medium text-gray-700 mb-1">Observaciones</p>
          {record.observations}
        </div>
      )}
    </div>
  );
}
