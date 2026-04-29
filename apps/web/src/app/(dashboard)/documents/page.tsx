'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { FileText, Download, Eye, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

const DOC_TYPE_ES: Record<string, string> = {
  BILL_OF_LADING: 'BL / Guía',
  COMMERCIAL_INVOICE: 'Factura Comercial',
  PACKING_LIST: 'Packing List',
  CUSTOMS_DECLARATION: 'Declaración Aduanera',
  CERTIFICATE_OF_ORIGIN: 'Cert. de Origen',
  INSURANCE: 'Seguro',
  OTHER: 'Otro',
};

interface Doc {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  createdAt: string;
  shipment: { reference: string; status: string };
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-documents'],
    queryFn: () => api.get('/api/documents').then(r => r.data.data as Doc[]),
  });

  const docs = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
          Documentos
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isLoading ? '—' : `${docs.length} documento${docs.length !== 1 ? 's' : ''}`} adjuntos a tus envíos
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">Cargando documentos...</div>
        ) : isError ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-7 h-7 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-3">Error al cargar los documentos</p>
            <button onClick={() => refetch()} className="inline-flex items-center gap-1 text-navy-700 text-sm hover:underline">
              <RefreshCw size={13} /> Reintentar
            </button>
          </div>
        ) : docs.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-1">No hay documentos aún</p>
            <p className="text-gray-400 text-xs">Los documentos aparecen cuando se adjuntan a un envío</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Nombre', 'Tipo', 'Envío', 'Tamaño', 'Fecha', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {docs.map(doc => (
                  <tr key={doc.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-800 font-medium max-w-[200px] truncate">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium">
                        {DOC_TYPE_ES[doc.type] ?? doc.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/shipments/${doc.shipment?.reference}`}
                        className="font-mono text-xs text-navy-700 hover:underline">
                        {doc.shipment?.reference ?? '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{fmtSize(doc.size)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(doc.createdAt).toLocaleDateString('es-GT')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <a href={doc.url} target="_blank" rel="noopener noreferrer"
                          className="text-gray-400 hover:text-navy-700 transition" title="Ver">
                          <Eye size={15} />
                        </a>
                        <a href={doc.url} download
                          className="text-gray-400 hover:text-navy-700 transition" title="Descargar">
                          <Download size={15} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
