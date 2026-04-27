'use client';

import { useParams, useRouter } from 'next/navigation';
import { useFoodImport, useUpdateFoodImportStatus } from '../../../../hooks/useFoodImport';
import { CFDIPreview } from '../../../../components/food-import/CFDIPreview';
import { MAGARequirementsCard } from '../../../../components/food-import/MAGARequirementsCard';
import { DocumentChecklist } from '../../../../components/food-import/DocumentChecklist';
import { useState } from 'react';

const STATUS_FLOW: Record<string, { label: string; next?: string; nextLabel?: string; color: string }> = {
  DRAFT:              { label: 'Borrador',             next: 'DOCUMENTS_PENDING', nextLabel: 'Iniciar documentación', color: 'bg-gray-100 text-gray-700' },
  DOCUMENTS_PENDING:  { label: 'Documentos pendientes', next: 'SIGIE_READY',        nextLabel: 'Marcar documentos listos', color: 'bg-yellow-100 text-yellow-700' },
  SIGIE_READY:        { label: 'Listo para SIGIE',      next: 'SIGIE_SUBMITTED',    nextLabel: 'Enviar a SIGIE',          color: 'bg-blue-100 text-blue-700' },
  SIGIE_SUBMITTED:    { label: 'Enviado a SIGIE',        next: 'MAGA_REVIEW',        nextLabel: 'En revisión MAGA',        color: 'bg-indigo-100 text-indigo-700' },
  MAGA_REVIEW:        { label: 'Revisión MAGA',          next: 'LAB_PENDING',        nextLabel: 'Enviar a laboratorio',    color: 'bg-purple-100 text-purple-700' },
  LAB_PENDING:        { label: 'Lab pendiente',           next: 'LAB_APPROVED',      nextLabel: 'Lab aprobado',            color: 'bg-orange-100 text-orange-700' },
  LAB_APPROVED:       { label: 'Lab aprobado',            next: 'APPROVED',          nextLabel: 'Aprobar importación',     color: 'bg-green-100 text-green-700' },
  LAB_REJECTED:       { label: 'Lab rechazado',           color: 'bg-red-100 text-red-700' },
  QUARANTINE:         { label: 'En cuarentena',           next: 'APPROVED',          nextLabel: 'Liberar cuarentena',      color: 'bg-orange-100 text-orange-700' },
  APPROVED:           { label: 'Aprobado',                next: 'RELEASED',          nextLabel: 'Liberar mercancía',       color: 'bg-green-100 text-green-700' },
  RELEASED:           { label: 'Liberado ✓',              color: 'bg-green-200 text-green-800' },
  REJECTED:           { label: 'Rechazado',               color: 'bg-red-100 text-red-700' },
};

const TIMELINE_STATUSES = [
  'DRAFT', 'DOCUMENTS_PENDING', 'SIGIE_READY', 'SIGIE_SUBMITTED',
  'MAGA_REVIEW', 'LAB_APPROVED', 'APPROVED', 'RELEASED',
];

export default function FoodImportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: record, isLoading } = useFoodImport(id);
  const updateStatus = useUpdateFoodImportStatus();
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  if (isLoading) return <div className="p-6 text-gray-500">Cargando…</div>;
  if (!record) return <div className="p-6 text-red-500">Registro no encontrado.</div>;

  const statusInfo = STATUS_FLOW[record.status] ?? { label: record.status, color: 'bg-gray-100 text-gray-700' };
  const currentIdx = TIMELINE_STATUSES.indexOf(record.status);

  const advance = async () => {
    if (!statusInfo.next) return;
    await updateStatus.mutateAsync({ id, status: statusInfo.next, notes: notes || undefined });
    setShowNotes(false);
    setNotes('');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-800 mb-2 flex items-center gap-1">
            ← Volver
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            Importación · {record.cfdiSerie}{record.cfdiFolio}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{record.productDescription} · HS {record.hsCode}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Timeline */}
      <div className="flex items-center gap-0 overflow-x-auto pb-2">
        {TIMELINE_STATUSES.map((s, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={s} className="flex items-center shrink-0">
              <div className={`h-2.5 w-2.5 rounded-full border-2 transition-colors ${
                done ? 'bg-green-500 border-green-500' :
                active ? 'bg-navy-700 border-navy-700' :
                'bg-white border-gray-300'
              }`} />
              {i < TIMELINE_STATUSES.length - 1 && (
                <div className={`w-8 h-0.5 ${done ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <CFDIPreview record={record} />
        <MAGARequirementsCard record={record} />
      </div>

      {record.documents && record.documents.length > 0 && (
        <DocumentChecklist documents={record.documents} />
      )}

      {/* SIGIE info */}
      {record.sigieRequestNumber && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm">
          <p className="font-semibold text-indigo-800">Número de solicitud SIGIE</p>
          <p className="font-mono text-indigo-700 mt-1 text-base">{record.sigieRequestNumber}</p>
        </div>
      )}

      {/* Advance status */}
      {statusInfo.next && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Siguiente acción</p>
            <button
              onClick={() => setShowNotes(s => !s)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              {showNotes ? 'Ocultar notas' : '+ Agregar notas'}
            </button>
          </div>
          {showNotes && (
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Notas opcionales…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
          )}
          <button
            onClick={advance}
            disabled={updateStatus.isPending}
            className="w-full rounded-lg py-2.5 text-sm font-semibold bg-navy-700 text-white hover:bg-navy-800 disabled:opacity-60"
          >
            {updateStatus.isPending ? 'Actualizando…' : statusInfo.nextLabel}
          </button>
        </div>
      )}
    </div>
  );
}
