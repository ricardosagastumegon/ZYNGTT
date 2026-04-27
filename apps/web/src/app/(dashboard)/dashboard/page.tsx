'use client';
import { useStats } from '@/hooks/useStats';
import { KPICard } from '@/components/dashboard/KPICard';
import { ShipmentsByStatusChart } from '@/components/dashboard/ShipmentsByStatusChart';
import { MonthlyShipmentsChart } from '@/components/dashboard/MonthlyShipmentsChart';
import { Package, CheckCircle, DollarSign, Clock } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { data, isLoading } = useStats();

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-700" /></div>;

  const stats = data?.data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Resumen de operaciones logísticas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard title="Envíos Activos" value={stats?.activeShipments ?? 0} icon={<Package />} color="blue" />
        <KPICard title="Completados (mes)" value={stats?.completedThisMonth ?? 0} icon={<CheckCircle />} color="green" />
        <KPICard title="Gasto este mes" value={`$${(stats?.spentThisMonth ?? 0).toFixed(2)}`} icon={<DollarSign />} color="purple" />
        <KPICard title="Tiempo promedio" value={`${stats?.avgDeliveryDays ?? 0}d`} icon={<Clock />} color="amber" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-700 mb-4">Envíos por estado</h2>
          <ShipmentsByStatusChart data={stats?.byStatus ?? []} />
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-700 mb-4">Envíos por mes</h2>
          <MonthlyShipmentsChart data={stats?.monthly ?? []} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-700">Últimos envíos</h2>
          <Link href="/shipments" className="text-navy-700 text-sm hover:underline">Ver todos</Link>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-400 border-b">
            <th className="pb-2">Referencia</th><th className="pb-2">Ruta</th>
            <th className="pb-2">Carrier</th><th className="pb-2">Estado</th>
          </tr></thead>
          <tbody className="divide-y">
            {(stats?.lastShipments ?? []).map((s: Record<string, string>) => (
              <tr key={s.id}>
                <td className="py-2 font-mono text-xs">{s.reference}</td>
                <td className="py-2">{s.origin} → {s.destination}</td>
                <td className="py-2">{s.carrier || '—'}</td>
                <td className="py-2"><span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">{s.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
