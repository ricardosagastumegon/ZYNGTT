'use client';
import { useState } from 'react';
import { useReport } from '@/hooks/useStats';
import { StatusBadge } from '@/components/shipments/StatusBadge';
import { Download, FileSpreadsheet } from 'lucide-react';

export default function ReportsPage() {
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const [from, setFrom] = useState(thirtyDaysAgo);
  const [to, setTo] = useState(today);
  const { data: shipments = [], isLoading } = useReport(from, to);

  const exportExcel = async () => {
    const { utils, writeFile } = await import('xlsx');
    const ws = utils.json_to_sheet(shipments.map((s: Record<string, unknown>) => ({
      Referencia: s.reference, Tipo: s.type, Modo: s.mode, Origen: s.origin,
      Destino: s.destination, Carrier: s.carrier, Estado: s.status,
      Fecha: new Date(s.createdAt as string).toLocaleDateString(),
      Pago: (s.payment as { amount?: number })?.amount ? `$${(s.payment as { amount: number }).amount.toFixed(2)}` : '—',
    })));
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Reporte');
    writeFile(wb, `axon-reporte-${from}-${to}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Reportes</h1>
        <button onClick={exportExcel} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          <FileSpreadsheet size={16} /> Exportar Excel
        </button>
      </div>

      <div className="flex gap-4 bg-white p-4 rounded-xl shadow-sm">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Desde</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Hasta</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="flex items-end">
          <span className="text-sm text-gray-500 py-2">{shipments.length} registros</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-gray-400">Cargando...</div> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>
              {['Referencia','Tipo','Ruta','Modo','Estado','Fecha','Monto'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-500">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y">
              {shipments.map((s: Record<string, unknown>) => (
                <tr key={s.id as string} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{s.reference as string}</td>
                  <td className="px-4 py-3">{s.type as string}</td>
                  <td className="px-4 py-3">{s.origin as string} → {s.destination as string}</td>
                  <td className="px-4 py-3">{s.mode as string}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.status as string} /></td>
                  <td className="px-4 py-3 text-gray-400">{new Date(s.createdAt as string).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-semibold">{(s.payment as { amount?: number })?.amount ? `$${(s.payment as { amount: number }).amount.toFixed(2)}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
