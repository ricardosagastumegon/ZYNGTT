'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Activity, RefreshCw, AlertCircle } from 'lucide-react';

interface LogEntry {
  id: string; action: string; description: string;
  ip?: string | null; createdAt: string;
  user: { firstName: string; lastName: string; email: string; role: string };
}

const ACTION_COLOR: Record<string, string> = {
  LOGIN:            'bg-green-100 text-green-700',
  LOGIN_FAILED:     'bg-red-100 text-red-700',
  CREATE_USER:      'bg-blue-100 text-blue-700',
  CHANGE_ROLE:      'bg-indigo-100 text-indigo-700',
  ACTIVATE_USER:    'bg-green-100 text-green-700',
  DEACTIVATE_USER:  'bg-amber-100 text-amber-700',
  RESET_PASSWORD:   'bg-amber-100 text-amber-700',
};

export default function AdminLogsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-logs', page],
    queryFn: () => api.get(`/api/admin/logs?page=${page}&limit=50`).then(r => r.data as { data: LogEntry[]; total: number; limit: number }),
    staleTime: 30_000,
  });

  const logs  = data?.data  ?? [];
  const total = data?.total ?? 0;
  const pages = Math.ceil(total / (data?.limit ?? 50));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
            Logs de Actividad
          </h1>
          <p className="text-sm text-gray-500 mt-1">{isLoading ? '—' : total} eventos registrados</p>
        </div>
        <button onClick={() => refetch()} className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400">Cargando logs…</div>
        ) : isError ? (
          <div className="p-10 text-center">
            <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <button onClick={() => refetch()} className="text-sm text-indigo-600 hover:underline">Reintentar</button>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center">
            <Activity className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Sin actividad registrada</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Usuario', 'Acción', 'Descripción', 'IP', 'Fecha'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800 text-xs">{log.user.firstName} {log.user.lastName}</p>
                        <p className="text-gray-400 text-xs">{log.user.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full font-mono ${ACTION_COLOR[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs max-w-xs truncate">{log.description}</td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{log.ip ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">Página {page} de {pages}</p>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                    ← Anterior
                  </button>
                  <button disabled={page === pages} onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
