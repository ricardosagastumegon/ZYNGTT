import { CheckCircle, Circle } from 'lucide-react';

interface HistoryEntry { id: string; status: string; notes?: string; createdAt: string; }

const STATUS_ORDER = ['DRAFT', 'CONFIRMED', 'IN_TRANSIT', 'AT_CUSTOMS', 'DELIVERED'];
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador', CONFIRMED: 'Confirmado', IN_TRANSIT: 'En tránsito',
  AT_CUSTOMS: 'En aduana', DELIVERED: 'Entregado', CANCELLED: 'Cancelado',
};

export function ShipmentTimeline({ history }: { history: HistoryEntry[] }) {
  return (
    <div className="space-y-4">
      {history.map((entry, i) => (
        <div key={entry.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center">
              <CheckCircle size={16} className="text-white" />
            </div>
            {i < history.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 my-1" />}
          </div>
          <div className="pb-4">
            <p className="font-medium text-gray-800 text-sm">{STATUS_LABELS[entry.status] ?? entry.status}</p>
            {entry.notes && <p className="text-xs text-gray-500 mt-0.5">{entry.notes}</p>}
            <p className="text-xs text-gray-400 mt-1">{new Date(entry.createdAt).toLocaleString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
