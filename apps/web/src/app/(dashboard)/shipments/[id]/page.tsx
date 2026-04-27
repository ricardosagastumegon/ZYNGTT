'use client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useShipment } from '@/hooks/useShipments';
import { StatusBadge } from '@/components/shipments/StatusBadge';
import { ShipmentTimeline } from '@/components/shipments/ShipmentTimeline';
import { FileText, MapPin, CreditCard, Package } from 'lucide-react';

const tabs = [
  { label: 'Resumen', icon: Package, href: '' },
  { label: 'Documentos', icon: FileText, href: '/documents' },
  { label: 'Tracking', icon: MapPin, href: '/tracking' },
  { label: 'Aduanas', icon: Package, href: '/customs' },
  { label: 'Pagos', icon: CreditCard, href: '/payments' },
];

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: shipment, isLoading } = useShipment(id);

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-700" /></div>;
  if (!shipment) return <div className="text-center text-gray-400 mt-16">Envío no encontrado</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 font-mono">{shipment.reference}</h1>
          <p className="text-gray-500 text-sm mt-1">{shipment.origin} → {shipment.destination}</p>
        </div>
        <StatusBadge status={shipment.status} />
      </div>

      <div className="flex gap-1 border-b">
        {tabs.map(({ label, icon: Icon, href }) => (
          <Link key={label} href={`/shipments/${id}${href}`}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-navy-700 border-b-2 border-transparent hover:border-navy-700 transition">
            <Icon size={15} />{label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-700 mb-4">Información del envío</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Tipo', shipment.type], ['Modo', shipment.mode],
                ['Carrier', shipment.carrier || '—'], ['N° Tracking', shipment.trackingNumber || '—'],
                ['Peso', shipment.weight ? `${shipment.weight} kg` : '—'],
                ['Volumen', shipment.volume ? `${shipment.volume} m³` : '—'],
              ].map(([k, v]) => (
                <div key={k}><dt className="text-gray-400">{k}</dt><dd className="font-medium text-gray-800 mt-0.5">{v}</dd></div>
              ))}
            </dl>
          </div>
          {shipment.description && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="font-semibold text-gray-700 mb-2">Mercancía</h2>
              <p className="text-sm text-gray-600">{shipment.description}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Historial de estados</h2>
          <ShipmentTimeline history={shipment.statusHistory ?? []} />
        </div>
      </div>
    </div>
  );
}
