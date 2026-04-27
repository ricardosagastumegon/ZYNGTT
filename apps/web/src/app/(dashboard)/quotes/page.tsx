'use client';
import { useQuotes } from '@/hooks/useQuotes';
import Link from 'next/link';
import { Plus } from 'lucide-react';

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  ACCEPTED: 'bg-blue-100 text-blue-700',
  EXPIRED: 'bg-gray-100 text-gray-500',
  CONVERTED: 'bg-green-100 text-green-700',
};

export default function QuotesPage() {
  const { data, isLoading } = useQuotes();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Cotizaciones</h1>
        <Link href="/quotes/new" className="flex items-center gap-2 bg-navy-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          <Plus size={16} /> Nueva cotización
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Ruta</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Modo</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Carrier</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Precio</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Estado</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Fecha</th>
            </tr></thead>
            <tbody className="divide-y">
              {data?.items?.map((q: Record<string, string>) => (
                <tr key={q.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{q.origin} → {q.destination}</td>
                  <td className="px-4 py-3">{q.mode}</td>
                  <td className="px-4 py-3">{q.carrier}</td>
                  <td className="px-4 py-3 font-semibold">${parseFloat(q.price).toFixed(2)}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[q.status] || ''}`}>{q.status}</span></td>
                  <td className="px-4 py-3 text-gray-400">{new Date(q.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
