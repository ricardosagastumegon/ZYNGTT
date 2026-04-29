'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Plus, FileText, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const STATUS_LABELS: Record<string, string> = {
  CFDI_PENDIENTE:   'CFDI Pendiente',
  DOCS_GENERADOS:   'Docs Generados',
  SIGIE_SOLICITADO: 'SIGIE Solicitado',
  SIGIE_APROBADO:   'MAGA Aprobado',
  DUCA_LISTA:       'DUCA Lista',
  DUCA_TRANSMITIDA: 'DUCA Transmitida',
  SEMAFORO_VERDE:   'Semáforo Verde',
  SEMAFORO_ROJO:    'Semáforo Rojo',
  LIBERADA:         'Liberada',
  RECHAZADA:        'Rechazada',
};

const STATUS_COLORS: Record<string, string> = {
  CFDI_PENDIENTE:   'bg-yellow-100 text-yellow-800',
  DOCS_GENERADOS:   'bg-blue-100 text-blue-800',
  SIGIE_SOLICITADO: 'bg-purple-100 text-purple-800',
  SIGIE_APROBADO:   'bg-indigo-100 text-indigo-800',
  DUCA_LISTA:       'bg-cyan-100 text-cyan-800',
  DUCA_TRANSMITIDA: 'bg-teal-100 text-teal-800',
  SEMAFORO_VERDE:   'bg-green-100 text-green-800',
  SEMAFORO_ROJO:    'bg-red-100 text-red-800',
  LIBERADA:         'bg-green-200 text-green-900',
  RECHAZADA:        'bg-red-200 text-red-900',
};

interface Expediente {
  id: string;
  status: string;
  expNombre: string;
  impNombre: string;
  totalUSD: number;
  pesoTotalKG: number;
  incoterm: string;
  createdAt: string;
  shipment?: { reference: string; status: string };
  user?: { firstName: string; lastName: string; company?: { name: string } | null };
}

export default function MisExpedientesPage() {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['expedientes'],
    queryFn: () => api.get('/api/import/list').then(r => r.data as { data: Expediente[]; total: number }),
  });

  const expedientes = data?.data ?? [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Expedientes</h1>
          <p className="text-sm text-gray-500 mt-1">
            {data?.total ?? 0} expediente{(data?.total ?? 0) !== 1 ? 's' : ''} en total
          </p>
        </div>
        <Link
          href="/import/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ backgroundColor: 'var(--brand-primary, #2563eb)' }}
        >
          <Plus size={16} />
          Nuevo Expediente
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--brand-primary, #2563eb)' }} />
        </div>
      ) : expedientes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No tienes expedientes todavía</p>
          <p className="text-sm text-gray-400 mt-1">Crea uno subiendo un CFDI XML</p>
          <Link
            href="/import/new"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
            style={{ backgroundColor: 'var(--brand-primary, #2563eb)' }}
          >
            <Plus size={16} />
            Crear Expediente
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Referencia</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Exportador</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Importador</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Valor USD</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Peso KG</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expedientes.map(exp => (
                <tr
                  key={exp.id}
                  onClick={() => router.push(`/import/${exp.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {exp.shipment?.reference ?? exp.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-gray-800 max-w-[160px] truncate">{exp.expNombre}</td>
                  <td className="px-4 py-3 text-gray-800 max-w-[160px] truncate">{exp.impNombre}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    ${exp.totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{exp.pesoTotalKG.toFixed(1)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[exp.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABELS[exp.status] ?? exp.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(exp.createdAt).toLocaleDateString('es-GT')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
