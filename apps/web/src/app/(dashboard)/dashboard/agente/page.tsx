'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AlertCircle, Clock, CheckCircle2, Send } from 'lucide-react';

interface AgentExpediente {
  id: string;
  expNombre: string;
  mercancias: { nombre: string; pesoKG: number }[];
  totalUSD: number;
  sigieStatus: string;
  status: string;
  shipment: { reference: string };
  user: { firstName: string; lastName: string; company?: { name: string } };
}

function statusColor(status: string) {
  const map: Record<string, string> = {
    CFDI_PENDIENTE: 'text-gray-500 bg-gray-100',
    DOCS_GENERADOS: 'text-blue-600 bg-blue-50',
    SIGIE_SOLICITADO: 'text-amber-600 bg-amber-50',
    SIGIE_APROBADO: 'text-green-600 bg-green-50',
    DUCA_LISTA: 'text-green-700 bg-green-100',
    DUCA_TRANSMITIDA: 'text-amber-700 bg-amber-100',
    SEMAFORO_VERDE: 'text-green-800 bg-green-200',
    SEMAFORO_ROJO: 'text-red-600 bg-red-50',
    LIBERADA: 'text-green-900 bg-green-300',
    RECHAZADA: 'text-red-800 bg-red-100',
  };
  return map[status] ?? 'text-gray-500 bg-gray-100';
}

const STATUS_LABELS: Record<string, string> = {
  CFDI_PENDIENTE: 'CFDI Pendiente',
  DOCS_GENERADOS: 'Docs Generados',
  SIGIE_SOLICITADO: 'SIGIE Solicitado',
  SIGIE_APROBADO: 'MAGA Aprobado',
  DUCA_LISTA: 'Listo para DUCA',
  DUCA_TRANSMITIDA: 'DUCA Transmitida',
  SEMAFORO_VERDE: 'Semáforo Verde',
  SEMAFORO_ROJO: 'Semáforo Rojo',
  LIBERADA: 'Liberada',
  RECHAZADA: 'Rechazada',
};

export default function AgenteDashboard() {
  const [transmitting, setTransmitting] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['agent-expedientes'],
    queryFn: () => api.get('/api/import/list').then(r => r.data.data as AgentExpediente[]),
  });

  const expedientes = data ?? [];
  const bloqueados = expedientes.filter(e => e.status === 'SIGIE_SOLICITADO' || (e.status !== 'DUCA_LISTA' && e.sigieStatus !== 'APROBADO' && e.status !== 'LIBERADA'));
  const enProceso = expedientes.filter(e => ['DOCS_GENERADOS', 'SIGIE_APROBADO'].includes(e.status));
  const listosParaTransmitir = expedientes.filter(e => e.status === 'DUCA_LISTA');
  const transmitidosHoy = expedientes.filter(e => {
    return e.status === 'DUCA_TRANSMITIDA' || e.status === 'SEMAFORO_VERDE';
  });

  async function handleTransmit(id: string) {
    setTransmitting(id);
    try {
      await api.post(`/api/automation/sat/${id}`);
      refetch();
    } finally {
      setTransmitting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
          Panel del Agente Aduanero
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Gestiona las transmisiones al SAT Guatemala
        </p>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Bloqueados', count: bloqueados.length, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'En proceso', count: enProceso.length, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Listos para transmitir', count: listosParaTransmitir.length, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
          { label: 'Transmitidos hoy', count: transmitidosHoy.length, icon: Send, color: 'text-blue-500', bg: 'bg-blue-50' },
        ].map(({ label, count, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-xl border p-4 flex items-center gap-3" style={{ borderColor: 'var(--color-border)', background: '#fff' }}>
            <div className={`rounded-lg p-2 ${bg}`}>
              <Icon className={`${color} w-5 h-5`} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-mono)' }}>{count}</p>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Expedientes table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)', background: '#fff' }}>
          <h2 className="font-semibold">Expedientes de Importación</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--neutral-50)' }}>
              <tr>
                {['Empresa', 'Productos', 'Valor USD', 'Estado', 'Acción'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">Cargando...</td></tr>
              ) : expedientes.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">No hay expedientes asignados</td></tr>
              ) : expedientes.map((exp) => {
                const canTransmit = exp.status === 'DUCA_LISTA';
                const isBlocked = exp.sigieStatus !== 'APROBADO' && exp.status !== 'LIBERADA';
                return (
                  <tr key={exp.id} className="border-t hover:bg-gray-50 transition" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="px-4 py-3 font-medium">{exp.user?.company?.name || `${exp.user?.firstName} ${exp.user?.lastName}`}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                      {(exp.mercancias as { nombre?: string }[])?.map((m, i) => (
                        <span key={i} className="text-xs rounded-full px-2 py-0.5 mr-1" style={{ background: 'var(--neutral-100)' }}>
                          {m.nombre ?? 'Mercancía'}
                        </span>
                      ))}
                    </td>
                    <td className="px-4 py-3 font-mono">${exp.totalUSD?.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor(exp.status)}`}>
                        {STATUS_LABELS[exp.status] ?? exp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {canTransmit ? (
                        <button
                          onClick={() => handleTransmit(exp.id)}
                          disabled={transmitting === exp.id}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg text-white transition disabled:opacity-60"
                          style={{ background: 'var(--success)' }}
                        >
                          {transmitting === exp.id ? 'Transmitiendo...' : 'Transmitir'}
                        </button>
                      ) : isBlocked ? (
                        <span className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'var(--neutral-100)', color: 'var(--color-text-tertiary)' }}>
                          Esperando MAGA
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
