'use client';
import { useParams } from 'next/navigation';
import { DocumentUploader } from '@/components/documents/DocumentUploader';
import { DocumentList } from '@/components/documents/DocumentList';

export default function ShipmentDocumentsPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Documentos del envío</h2>
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-700 mb-4">Subir documento</h3>
        <DocumentUploader shipmentId={id} />
      </div>
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-700 mb-4">Documentos subidos</h3>
        <DocumentList shipmentId={id} />
      </div>
    </div>
  );
}
