'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useShipments } from '@/hooks/useShipments';
import { StatusBadge } from '@/components/shipments/StatusBadge';
import { Eye } from 'lucide-react';

const STATUSES = ['', 'DRAFT', 'CONFIRMED', 'IN_TRANSIT', 'AT_CUSTOMS', 'DELIVERED', 'CANCELLED'];

export default function ShipmentsPage() {
  const [status, setStatus] = useState('');
  const { data, isLoading } = useShipments(status ? { status } : undefined);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Envíos</h1>
        <Link href="/quotes/new" className="bg-navy-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">+ Nuevo envío</Link>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUSES.map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${status === s ? 'bg-navy-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s || 'Todos'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-gray-400">Cargando...</div> : (
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
              {data?.items?.map((s: Record<string, string>) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{s.reference}</td>
                  <td className="px-4 py-3">{s.origin} → {s.destination}</td>
                  <td className="px-4 py-3 text-gray-500">{s.mode}</td>
                  <td className="px-4 py-3">{s.carrier || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-3 text-gray-400">{new Date(s.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Link href={`/shipments/${s.id}`} className="text-navy-700 hover:text-navy-900"><Eye size={16} /></Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
