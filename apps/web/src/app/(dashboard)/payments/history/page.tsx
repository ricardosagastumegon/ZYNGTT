'use client';
import { usePaymentHistory } from '@/hooks/usePayments';
import { Download } from 'lucide-react';

const statusColors: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  FAILED: 'bg-red-100 text-red-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
};

export default function PaymentHistoryPage() {
  const { data: payments = [], isLoading } = usePaymentHistory();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Historial de pagos</h1>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-gray-400">Cargando...</div> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Referencia</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Ruta</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Monto</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Estado</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Fecha</th>
              <th className="px-4 py-3" />
            </tr></thead>
            <tbody className="divide-y">
              {payments.map((p: Record<string, string & { reference: string; origin: string; destination: string }>) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{(p.shipment as { reference: string })?.reference}</td>
                  <td className="px-4 py-3 text-gray-600">{(p.shipment as { origin: string; destination: string })?.origin} → {(p.shipment as { destination: string })?.destination}</td>
                  <td className="px-4 py-3 font-semibold">${parseFloat(p.amount as unknown as string).toFixed(2)} {p.currency}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[p.status] ?? ''}`}>{p.status}</span></td>
                  <td className="px-4 py-3 text-gray-400">{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">
                    {p.stripeInvoiceUrl && <a href={p.stripeInvoiceUrl as string} target="_blank" className="text-navy-700 hover:text-navy-900"><Download size={16} /></a>}
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
