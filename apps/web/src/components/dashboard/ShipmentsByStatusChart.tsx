'use client';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS: Record<string, string> = {
  DRAFT: '#9ca3af', CONFIRMED: '#3b82f6', IN_TRANSIT: '#d97706',
  AT_CUSTOMS: '#8b5cf6', DELIVERED: '#16a34a', CANCELLED: '#dc2626',
};
const LABELS: Record<string, string> = {
  DRAFT: 'Borrador', CONFIRMED: 'Confirmado', IN_TRANSIT: 'En tránsito',
  AT_CUSTOMS: 'En aduana', DELIVERED: 'Entregado', CANCELLED: 'Cancelado',
};

export function ShipmentsByStatusChart({ data }: { data: { status: string; count: number }[] }) {
  if (!data.length) return <div className="text-center text-gray-300 py-8 text-sm">Sin datos</div>;
  const chartData = data.map(d => ({ name: LABELS[d.status] ?? d.status, value: d.count }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
          {data.map(d => <Cell key={d.status} fill={COLORS[d.status] ?? '#9ca3af'} />)}
        </Pie>
        <Tooltip formatter={(v) => [`${v} envíos`]} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
