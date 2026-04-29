'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Truck, MapPin, Calendar, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

interface Shipment {
  id: string; reference: string; origin: string; destination: string;
  status: string; estimatedDelivery: string | null; carrier: string | null;
  expediente?: { pilotoNombre: string | null; pilotoLicencia: string | null; cabezalPlaca: string | null } | null;
}

const STATUS_ES: Record<string, string> = {
  DRAFT: 'Borrador', CONFIRMED: 'Confirmado', IN_TRANSIT: 'En tránsito',
  AT_CUSTOMS: 'En aduana', DELIVERED: 'Entregado', CANCELLED: 'Cancelado',
};

export default function TransporteDashboard() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['transport-shipments'],
    queryFn: () => api.get('/api/shipments').then(r => r.data.data),
  });

  const shipments: Shipment[] = data?.items ?? data?.shipments ?? [];
  const active    = shipments.filter(s => s.status === 'IN_TRANSIT' || s.status === 'AT_CUSTOMS');
  const pending   = shipments.filter(s => s.status === 'CONFIRMED');
  const delivered = shipments.filter(s => s.status === 'DELIVERED');

  function datosCompletos(s: Shipment) {
    return !!(s.expediente?.pilotoNombre && s.expediente?.cabezalPlaca);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
          Panel Transportista
        </h1>
        <p className="text-sm text-gray-500 mt-1">Rutas y envíos asignados</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'En tránsito',  value: active.length,    icon: Truck,        color: 'text-blue-600',  bg: 'bg-blue-50' },
          { label: 'Confirmados',  value: pending.length,   icon: Calendar,     color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Entregados',   value: delivered.length, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
            <div className={`rounded-xl p-3 ${bg}`}><Icon className={`w-5 h-5 ${color}`} /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-mono)' }}>
                {isLoading ? '—' : value}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Envíos table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Mis envíos</h2>
          <button onClick={() => refetch()} className="text-gray-400 hover:text-gray-600"><RefreshCw size={15} /></button>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-gray-400">Cargando envíos...</div>
        ) : isError ? (
          <div className="p-10 text-center">
            <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-2">Error al cargar los datos</p>
            <button onClick={() => refetch()} className="inline-flex items-center gap-1 text-navy-700 text-sm hover:underline">
              <RefreshCw size={13} /> Reintentar
            </button>
          </div>
        ) : shipments.length === 0 ? (
          <div className="p-10 text-center">
            <Truck className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No tienes envíos asignados aún</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Referencia', 'Ruta', 'Estado', 'Entrega estimada', 'Acción'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {shipments.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700">{s.reference}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="inline-flex items-center gap-1"><MapPin size={12} className="text-gray-400" />{s.origin} → {s.destination}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        s.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-700' :
                        s.status === 'DELIVERED'  ? 'bg-green-100 text-green-700' :
                        s.status === 'AT_CUSTOMS' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {STATUS_ES[s.status] ?? s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {s.estimatedDelivery ? new Date(s.estimatedDelivery).toLocaleDateString('es-GT') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {datosCompletos(s) ? (
                        <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                          <CheckCircle2 size={13} /> Completo
                        </span>
                      ) : (
                        <Link href={`/shipments/${s.id}`}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition">
                          Completar datos
                        </Link>
                      )}
                    </td>
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
