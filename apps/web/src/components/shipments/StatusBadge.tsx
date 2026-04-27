const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT:      { label: 'Borrador',   className: 'bg-gray-100 text-gray-600' },
  CONFIRMED:  { label: 'Confirmado', className: 'bg-blue-100 text-blue-700' },
  IN_TRANSIT: { label: 'En tránsito',className: 'bg-amber-100 text-amber-700' },
  AT_CUSTOMS: { label: 'En aduana',  className: 'bg-purple-100 text-purple-700' },
  DELIVERED:  { label: 'Entregado',  className: 'bg-green-100 text-green-700' },
  CANCELLED:  { label: 'Cancelado',  className: 'bg-red-100 text-red-700' },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>{cfg.label}</span>;
}
