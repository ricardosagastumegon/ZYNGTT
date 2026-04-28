'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Truck, Calendar, MapPin } from 'lucide-react';

export default function TransporteDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['transport-shipments'],
    queryFn: () => api.get('/api/shipments').then(r => r.data.data),
  });

  const shipments = data?.shipments ?? [];
  const active = shipments.filter((s: { status: string }) => s.status === 'IN_TRANSIT');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Panel Transportista</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Rutas y envíos activos</p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Envíos activos', value: active.length, icon: Truck },
          { label: 'Rutas este mes', value: shipments.length, icon: MapPin },
          { label: 'Próximos cruces', value: active.filter((s: { estimatedDelivery: string }) => s.estimatedDelivery).length, icon: Calendar },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border p-5 bg-white" style={{ borderColor: 'var(--color-border)' }}>
            <Icon className="w-5 h-5 mb-2" style={{ color: 'var(--brand-primary)' }} />
            <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-mono)' }}>{isLoading ? '—' : value}</p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
