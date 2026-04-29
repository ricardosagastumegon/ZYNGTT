'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { ImportStatusBadge } from '@/components/import/ImportStatusBadge';
import { Package, CheckCircle2, DollarSign, AlertCircle, Plus, RefreshCw } from 'lucide-react';

interface Expediente {
  id: string;
  cfdiUUID: string;
  expNombre: string;
  status: string;
  totalUSD: number;
  createdAt: string;
  shipment: { reference: string };
}

export default function EmpresaDashboard() {
  const { user } = useAuth();

  const { data: exps, isLoading, isError, refetch } = useQuery({
    queryKey: ['empresa-expedientes'],
    queryFn: () => api.get('/api/import/list').then(r => r.data.data as Expediente[]),
  });

  const expedientes = exps ?? [];
  const activos    = expedientes.filter(e => !['LIBERADA', 'RECHAZADA'].includes(e.status));
  const completados = expedientes.filter(e => e.status === 'LIBERADA');
  const totalGasto = expedientes.filter(e => e.status === 'LIBERADA').reduce((s, e) => s + (e.totalUSD ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
            Bienvenido, {user?.firstName}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{user?.company?.name ?? 'Tu empresa'}</p>
        </div>
        <Link href="/import/new"
          className="inline-flex items-center gap-2 bg-navy-700 hover:bg-navy-900 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition">
          <Plus size={16} /> Nueva Importación MX→GT
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Expedientes activos',   value: activos.length,    icon: Package,      color: 'text-blue-600',  bg: 'bg-blue-50' },
          { label: 'Completados',           value: completados.length, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Gasto total liberado',  value: `$${totalGasto.toLocaleString('es-GT', { minimumFractionDigits: 0 })}`, icon: DollarSign, color: 'text-violet-600', bg: 'bg-violet-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
            <div className={`rounded-xl p-3 ${bg}`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-mono)' }}>{isLoading ? '—' : value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Expedientes table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Mis Expedientes</h2>
          <Link href="/import" className="text-navy-700 text-sm hover:underline">Ver todos</Link>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-gray-400">Cargando expedientes...</div>
        ) : isError ? (
          <div className="p-10 text-center">
            <AlertCircle className="w-7 h-7 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-3">Error al cargar los datos</p>
            <button onClick={() => refetch()} className="inline-flex items-center gap-1 text-navy-700 text-sm hover:underline">
              <RefreshCw size={13} /> Reintentar
            </button>
          </div>
        ) : expedientes.length === 0 ? (
          <div className="p-10 text-center">
            <Package className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-3">Aún no tienes expedientes de importación</p>
            <Link href="/import/new" className="inline-flex items-center gap-1 bg-navy-700 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-navy-900 transition">
              <Plus size={14} /> Crear primera importación
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Referencia', 'Exportador', 'Estado', 'Valor USD', 'Fecha'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {expedientes.slice(0, 8).map(exp => (
                  <tr key={exp.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700">
                      <Link href={`/import/${exp.id}`} className="hover:text-navy-700">{exp.shipment?.reference ?? exp.id.slice(-8)}</Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">{exp.expNombre}</td>
                    <td className="px-4 py-3"><ImportStatusBadge status={exp.status} size="sm" /></td>
                    <td className="px-4 py-3 font-mono text-gray-700">${exp.totalUSD?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-400">{new Date(exp.createdAt).toLocaleDateString('es-GT')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
