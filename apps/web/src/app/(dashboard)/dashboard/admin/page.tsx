'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Users, Package, TrendingUp, DollarSign } from 'lucide-react';

export default function AdminDashboard() {
  const { data } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/api/stats/dashboard').then(r => r.data.data),
  });

  const stats = [
    { label: 'Envíos activos', value: data?.activeShipments ?? '—', icon: Package, color: 'text-blue-600' },
    { label: 'Completados este mes', value: data?.completedThisMonth ?? '—', icon: TrendingUp, color: 'text-green-600' },
    { label: 'Facturado USD', value: data?.totalSpent ? `$${Number(data.totalSpent).toLocaleString()}` : '—', icon: DollarSign, color: 'text-violet-600' },
    { label: 'Usuarios', value: '—', icon: Users, color: 'text-amber-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Panel Administrador</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Vista general del sistema</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border p-5 bg-white" style={{ borderColor: 'var(--color-border)' }}>
            <Icon className={`w-5 h-5 mb-3 ${color}`} />
            <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-mono)' }}>{value}</p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
