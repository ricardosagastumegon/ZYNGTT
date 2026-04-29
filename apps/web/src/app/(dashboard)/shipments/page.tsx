'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useShipments } from '@/hooks/useShipments';
import { StatusBadge } from '@/components/shipments/StatusBadge';
import { Eye, AlertCircle, Package } from 'lucide-react';

const STATUSES = ['', 'DRAFT', 'CONFIRMED', 'IN_TRANSIT', 'AT_CUSTOMS', 'DELIVERED', 'CANCELLED'];
const STATUS_LABELS: Record<string, string> = {
  '': 'Todos', DRAFT: 'Borrador', CONFIRMED: 'Confirmado', IN_TRANSIT: 'En tránsito',
  AT_CUSTOMS: 'En aduana', DELIVERED: 'Entregado', CANCELLED: 'Cancelado',
};

export default function ShipmentsPage() {
  const [status, setStatus] = useState('');
  const { data, isLoading, isError, refetch } = useShipments(status ? { status } : undefined);
  const items = data?.items ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Envíos</h1>
        <Link href="/quotes/new" className="bg-navy-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-navy-900 transition">
          + Nuevo envío
        </Link>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUSES.map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${status === s ? 'bg-navy-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {STATUS_LABELS[s] ?? s}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">Cargando envíos...</div>
        ) : isError ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-3">Error al cargar los envíos</p>
            <button onClick={() => refetch()} className="text-navy-700 text-sm font-medium hover:underline">
              Reintentar
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-1">
              {status ? `No hay envíos con estado "${STATUS_LABELS[status]}"` : 'No tienes envíos aún'}
            </p>
            {status ? (
              <button onClick={() => setStatus('')} className="text-navy-700 text-sm font-medium hover:underline">
                Ver todos
              </button>
            ) : (
              <Link href="/quotes/new" className="text-navy-700 text-sm font-medium hover:underline">
                Crear tu primer envío
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Referencia</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Ruta</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Modo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Carrier</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Fecha</th>
                <th className="px-4 py-3" />
              </tr></thead>
              <tbody className="divide-y">
                {items.map((s: Record<string, string>) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{s.reference}</td>
                    <td className="px-4 py-3">{s.origin} → {s.destination}</td>
                    <td className="px-4 py-3 text-gray-500">{s.mode}</td>
                    <td className="px-4 py-3">{s.carrier || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3 text-gray-400">{new Date(s.createdAt).toLocaleDateString('es-GT')}</td>
                    <td className="px-4 py-3">
                      <Link href={`/shipments/${s.id}`} className="text-navy-700 hover:text-navy-900"><Eye size={16} /></Link>
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
