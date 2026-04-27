'use client';

import Link from 'next/link';
import { useFoodImports } from '../../../hooks/useFoodImport';
import { useState } from 'react';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  DOCUMENTS_PENDING: 'bg-yellow-100 text-yellow-700',
  SIGIE_READY: 'bg-blue-100 text-blue-700',
  SIGIE_SUBMITTED: 'bg-indigo-100 text-indigo-700',
  MAGA_REVIEW: 'bg-purple-100 text-purple-700',
  LAB_PENDING: 'bg-orange-100 text-orange-700',
  LAB_APPROVED: 'bg-green-100 text-green-700',
  LAB_REJECTED: 'bg-red-100 text-red-700',
  QUARANTINE: 'bg-orange-100 text-orange-700',
  APPROVED: 'bg-green-100 text-green-700',
  RELEASED: 'bg-green-200 text-green-800',
  REJECTED: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador', DOCUMENTS_PENDING: 'Docs. Pendientes',
  SIGIE_READY: 'Listo SIGIE', SIGIE_SUBMITTED: 'En SIGIE',
  MAGA_REVIEW: 'Rev. MAGA', LAB_PENDING: 'Lab pendiente',
  LAB_APPROVED: 'Lab aprobado', LAB_REJECTED: 'Lab rechazado',
  QUARANTINE: 'Cuarentena', APPROVED: 'Aprobado',
  RELEASED: 'Liberado', REJECTED: 'Rechazado',
};

export default function FoodImportListPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useFoodImports(page);

  const fmt = (n: number) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Importaciones de Alimentos</h1>
          <p className="text-sm text-gray-500 mt-0.5">México → Guatemala · MAGA / SIGIE</p>
        </div>
        <Link
          href="/food-import/new"
          className="rounded-lg px-4 py-2 text-sm font-semibold bg-navy-700 text-white hover:bg-navy-800"
        >
          + Nueva importación
        </Link>
      </div>

      {isLoading ? (
        <div className="text-gray-400 text-sm">Cargando…</div>
      ) : !data?.items.length ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
          <p className="text-2xl mb-2">🌽</p>
          <p className="font-medium text-gray-700">Sin importaciones registradas</p>
          <p className="text-sm text-gray-500 mt-1">Carga tu primer CFDI para comenzar</p>
          <Link href="/food-import/new" className="mt-4 inline-block rounded-lg px-4 py-2 text-sm font-semibold bg-navy-700 text-white hover:bg-navy-800">
            Crear primera importación
          </Link>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">CFDI</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Exportador</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Producto / HS</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Valor USD</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/food-import/${r.id}`} className="font-medium text-navy-700 hover:underline">
                        {r.cfdiSerie}{r.cfdiFolio}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{r.exporterName}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 truncate max-w-[180px]">{r.productDescription}</p>
                      <span className="text-xs font-mono text-gray-400">HS {r.hsCode}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(r.commercialValueUSD)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{r.createdAt.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.total > data.limit && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{data.total} registros totales</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="rounded px-3 py-1.5 border border-gray-300 disabled:opacity-40 hover:bg-gray-50">
                  Anterior
                </button>
                <button onClick={() => setPage(p => p + 1)} disabled={page * data.limit >= data.total}
                  className="rounded px-3 py-1.5 border border-gray-300 disabled:opacity-40 hover:bg-gray-50">
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
