'use client';
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useUploadDocument } from '@/hooks/useDocuments';
import { Upload, Loader2 } from 'lucide-react';

const DOC_TYPES = [
  { value: 'BILL_OF_LADING', label: 'Bill of Lading' },
  { value: 'COMMERCIAL_INVOICE', label: 'Factura Comercial' },
  { value: 'PACKING_LIST', label: 'Packing List' },
  { value: 'CUSTOMS_DECLARATION', label: 'Declaración Aduanera' },
  { value: 'CERTIFICATE_OF_ORIGIN', label: 'Cert. de Origen' },
  { value: 'INSURANCE', label: 'Seguro' },
  { value: 'OTHER', label: 'Otro' },
];

export function DocumentUploader({ shipmentId }: { shipmentId: string }) {
  const [type, setType] = useState('OTHER');
  const { mutateAsync: upload, isPending } = useUploadDocument(shipmentId);

  const onDrop = useCallback(async (files: File[]) => {
    for (const file of files) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', type);
      await upload(fd);
    }
  }, [type, upload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': [], 'image/*': [], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [] },
    maxSize: 10 * 1024 * 1024,
  });

  return (
    <div className="space-y-3">
      <select value={type} onChange={e => setType(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
        {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>

      <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${isDragActive ? 'border-navy-700 bg-navy-50' : 'border-gray-300 hover:border-navy-400'}`}>
        <input {...getInputProps()} />
        {isPending ? (
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <Loader2 size={20} className="animate-spin" /> Subiendo...
          </div>
        ) : (
          <>
            <Upload size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">{isDragActive ? 'Suelta el archivo aquí' : 'Arrastra archivos o haz clic para seleccionar'}</p>
            <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, DOCX — máx. 10MB</p>
          </>
        )}
      </div>
    </div>
  );
}
