'use client';

import { FoodImportRecord } from '@/hooks/useFoodImport';

interface Props {
  record: FoodImportRecord;
}

export function CFDIPreview({ record }: Props) {
  const fmt = (n: number, currency = 'USD') =>
    new Intl.NumberFormat('es-GT', { style: 'currency', currency }).format(n);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">CFDI {record.cfdiSerie}{record.cfdiFolio}</h3>
        <span className="text-xs text-gray-500">{record.cfdiFecha?.slice(0, 10)}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Exportador (MX)</p>
          <p className="font-medium text-gray-900">{record.exporterName}</p>
          <p className="text-gray-500">RFC: {record.exporterRFC}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Importador (GT)</p>
          <p className="font-medium text-gray-900">{record.importerName}</p>
          <p className="text-gray-500">NIT: {record.importerNIT}</p>
        </div>
      </div>

      <div className="border-t pt-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Producto</p>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-gray-900">{record.productDescription}</p>
            <span className="inline-block mt-1 rounded bg-navy-100 px-2 py-0.5 text-xs font-mono font-semibold text-navy-700">
              HS {record.hsCode}
            </span>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold text-gray-900">{fmt(record.commercialValueUSD)}</p>
            <p className="text-xs text-gray-500">{record.incoterm}</p>
          </div>
        </div>
      </div>

      {record.tributes && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 space-y-1.5 text-sm">
          <p className="font-semibold text-amber-800 text-xs uppercase tracking-wide">Tributos Estimados (GTQ)</p>
          <div className="flex justify-between">
            <span className="text-gray-700">Valor CIF</span>
            <span className="font-medium">{fmt(record.tributes.cifValueGTQ, 'GTQ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">DAI ({(record.daiRate * 100).toFixed(0)}%)</span>
            <span className="font-medium">{fmt(record.tributes.daiAmount, 'GTQ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">IVA (12%)</span>
            <span className="font-medium">{fmt(record.tributes.ivaAmount, 'GTQ')}</span>
          </div>
          <div className="flex justify-between border-t border-amber-200 pt-1.5 font-semibold text-amber-900">
            <span>Total Tributos</span>
            <span>{fmt(record.tributes.totalTributes, 'GTQ')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
