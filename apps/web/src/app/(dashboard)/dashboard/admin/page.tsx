'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { ImportStatusBadge } from '@/components/import/ImportStatusBadge';
import { Building2, UserCheck, Truck, Package, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface AdminStats {
  totalEmpresas: number;
  totalAgentes: number;
  totalTransportistas: number;
  totalExpedientes: number;
  expedientesActivos: number;
  expedientesLiberados: number;
  ultimaActividad: {
    id: string; status: string; expNombre: string; updatedAt: string;
    user: { firstName: string; lastName: string; company?: { name: string } | null };
    shipment?: { reference: string } | null;
  }[];
}

export default function AdminDashboard() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/api/stats/admin').then(r => r.data.data as AdminStats),
  });

  const kpis = [
    { label: 'Empresas',             value: data?.totalEmpresas,        icon: Building2,    color: 'text-indigo-600', bg: 'bg-indigo-50', href: '/empresas' },
    { label: 'Agentes Aduanales',    value: data?.totalAgentes,          icon: UserCheck,    color: 'text-blue-600',   bg: 'bg-blue-50',   href: '/agentes' },
    { label: 'Transportistas',       value: data?.totalTransportistas,   icon: Truck,        color: 'text-amber-600',  bg: 'bg-amber-50',  href: '/transportistas' },
    { label: 'Expedientes activos',  value: data?.expedientesActivos,    icon: Package,      color: 'text-violet-600', bg: 'bg-violet-50', href: '/import' },
    { label: 'Liberados este mes',   value: data?.expedientesLiberados,  icon: CheckCircle2, color: 'text-green-600',  bg: 'bg-green-50',  href: '/import' },
    { label: 'Total expedientes',    value: data?.totalExpedientes,      icon: Package,      color: 'text-gray-600',   bg: 'bg-gray-100',  href: '/import' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
          Panel Administrador
        </h1>
        <p className="text-sm text-gray-500 mt-1">Vista global del sistema</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {kpis.map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link key={label} href={href} className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4 hover:border-navy-200 transition group">
            <div className={`rounded-xl p-3 ${bg}`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 group-hover:text-navy-700" style={{ fontFamily: 'var(--font-mono)' }}>
                {isLoading ? '—' : (value ?? 0)}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Gestionar empresas',         href: '/empresas' },
          { label: 'Ver todos los expedientes',   href: '/import' },
          { label: 'Gestionar usuarios',          href: '/usuarios' },
          { label: 'Configuración',               href: '/settings' },
        ].map(({ label, href }) => (
          <Link key={href} href={href}
            className="bg-navy-700 hover:bg-navy-900 text-white text-sm font-medium text-center px-4 py-3 rounded-lg transition">
            {label}
          </Link>
        ))}
      </div>

      {/* Últimas actividades */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Últimas actividades</h2>
          <button onClick={() => refetch()} className="text-gray-400 hover:text-gray-600">
            <RefreshCw size={15} />
          </button>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-gray-400">Cargando actividades...</div>
        ) : isError ? (
          <div className="p-10 text-center">
            <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-2">Error al cargar datos</p>
            <button onClick={() => refetch()} className="text-navy-700 text-sm hover:underline">Reintentar</button>
          </div>
        ) : (data?.ultimaActividad?.length ?? 0) === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Sin actividad reciente</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Empresa', 'Exportador', 'Estado', 'Fecha'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(data?.ultimaActividad ?? []).map(act => (
                  <tr key={act.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">
                      {act.user?.company?.name ?? `${act.user?.firstName} ${act.user?.lastName}`}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">{act.expNombre}</td>
                    <td className="px-4 py-3"><ImportStatusBadge status={act.status} size="sm" /></td>
                    <td className="px-4 py-3 text-gray-400">{new Date(act.updatedAt).toLocaleDateString('es-GT')}</td>
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
