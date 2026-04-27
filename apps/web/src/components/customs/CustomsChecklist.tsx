'use client';
import { useCustomsChecklist } from '@/hooks/useCustoms';
import { CheckCircle, Circle, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const DOC_LABELS: Record<string, string> = {
  BILL_OF_LADING: 'Bill of Lading', COMMERCIAL_INVOICE: 'Factura Comercial',
  PACKING_LIST: 'Packing List', CUSTOMS_DECLARATION: 'Declaración Aduanera',
  CERTIFICATE_OF_ORIGIN: 'Certificado de Origen', INSURANCE: 'Seguro', OTHER: 'Otro',
};

export function CustomsChecklist({ shipmentId }: { shipmentId: string }) {
  const { data: checklist = [], isLoading } = useCustomsChecklist(shipmentId);
  const pending = checklist.filter((c: { uploaded: boolean }) => !c.uploaded).length;

  if (isLoading) return <div className="text-gray-400 text-sm">Cargando checklist...</div>;

  return (
    <div>
      {pending > 0 && <div className="mb-3 p-3 bg-amber-50 text-amber-700 rounded-lg text-sm">{pending} documento(s) pendiente(s)</div>}
      <div className="space-y-2">
        {checklist.map((item: { doc: string; uploaded: boolean; required: boolean }) => (
          <div key={item.doc} className={`flex items-center gap-3 p-3 rounded-lg border ${item.uploaded ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
            {item.uploaded ? <CheckCircle size={18} className="text-green-500 shrink-0" /> : <Circle size={18} className="text-gray-300 shrink-0" />}
            <span className={`text-sm flex-1 ${item.uploaded ? 'text-green-700 line-through' : 'text-gray-700'}`}>{DOC_LABELS[item.doc] ?? item.doc}</span>
            {!item.uploaded && (
              <Link href={`/shipments/${shipmentId}/documents`} className="text-navy-700 hover:text-navy-900">
                <ExternalLink size={14} />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
