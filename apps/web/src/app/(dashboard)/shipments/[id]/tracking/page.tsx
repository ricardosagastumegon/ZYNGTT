'use client';
import { useParams } from 'next/navigation';
import { useTrackingEvents, useSyncTracking } from '@/hooks/useTracking';
import { TrackingTimeline } from '@/components/tracking/TrackingTimeline';
import { RefreshCw } from 'lucide-react';

export default function ShipmentTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const { data: events = [], isLoading } = useTrackingEvents(id);
  const { mutate: sync, isPending } = useSyncTracking(id);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Tracking del envío</h2>
        <button onClick={() => sync()} disabled={isPending}
          className="flex items-center gap-2 text-sm text-navy-700 border border-navy-700 px-3 py-1.5 rounded-lg hover:bg-navy-50 transition disabled:opacity-50">
          <RefreshCw size={14} className={isPending ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        {isLoading ? <div className="text-center text-gray-400 py-8">Cargando...</div>
          : events.length === 0 ? <div className="text-center text-gray-400 py-8">Sin eventos de tracking aún</div>
          : <TrackingTimeline events={events} current />}
      </div>
    </div>
  );
}
