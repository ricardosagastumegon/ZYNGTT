import { MapPin, Clock } from 'lucide-react';

interface TrackingEvent { id?: string; status: string; location?: string; description: string; occurredAt: string; }

const statusColors: Record<string, string> = {
  delivered: 'bg-green-500', in_transit: 'bg-blue-500', out_for_delivery: 'bg-amber-500',
  exception: 'bg-red-500', unknown: 'bg-gray-400',
};

export function TrackingTimeline({ events, current }: { events: TrackingEvent[]; current?: boolean }) {
  return (
    <div className="space-y-4">
      {events.map((event, i) => {
        const color = statusColors[event.status.toLowerCase()] ?? 'bg-gray-400';
        const isLatest = i === 0 && current;
        return (
          <div key={event.id ?? i} className={`flex gap-4 ${isLatest ? 'opacity-100' : 'opacity-70'}`}>
            <div className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full ${color} ${isLatest ? 'ring-4 ring-offset-2 ring-navy-200' : ''} mt-1 shrink-0`} />
              {i < events.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 my-1.5" />}
            </div>
            <div className={`pb-4 ${i === events.length - 1 ? '' : ''}`}>
              <p className={`font-semibold text-sm ${isLatest ? 'text-navy-700' : 'text-gray-700'}`}>{event.description}</p>
              <div className="flex gap-3 mt-1 text-xs text-gray-400">
                {event.location && <span className="flex items-center gap-1"><MapPin size={11} />{event.location}</span>}
                <span className="flex items-center gap-1"><Clock size={11} />{new Date(event.occurredAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
