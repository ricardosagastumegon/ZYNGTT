'use client';
import { useDocuments, useDeleteDocument } from '@/hooks/useDocuments';
import { FileText, Download, Trash2, Eye } from 'lucide-react';

const TYPE_LABELS: Record<string, string> = {
  BILL_OF_LADING: 'BL', COMMERCIAL_INVOICE: 'Factura', PACKING_LIST: 'Packing',
  CUSTOMS_DECLARATION: 'Aduana', CERTIFICATE_OF_ORIGIN: 'Origen', INSURANCE: 'Seguro', OTHER: 'Otro',
};

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentList({ shipmentId }: { shipmentId: string }) {
  const { data: docs = [], isLoading } = useDocuments(shipmentId);
  const { mutate: deleteDoc } = useDeleteDocument(shipmentId);

  if (isLoading) return <div className="text-center text-gray-400 py-8">Cargando documentos...</div>;
  if (!docs.length) return <div className="text-center text-gray-400 py-8">Sin documentos aún</div>;

  return (
    <div className="space-y-2">
      {docs.map((doc: Record<string, string & number>) => (
        <div key={doc.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
          <FileText size={20} className="text-navy-700 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{doc.name}</p>
            <p className="text-xs text-gray-400">{TYPE_LABELS[doc.type] ?? doc.type} · {formatSize(doc.size)} · {new Date(doc.createdAt).toLocaleDateString()}</p>
          </div>
          <div className="flex gap-2">
            <a href={`/api/documents/${doc.id}/view`} target="_blank" className="text-gray-400 hover:text-navy-700"><Eye size={16} /></a>
            <a href={doc.url} download className="text-gray-400 hover:text-navy-700"><Download size={16} /></a>
            <button onClick={() => deleteDoc(doc.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}
