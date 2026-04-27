'use client';
import { useState } from 'react';
import { useHsCodeRequirements } from '@/hooks/useCustoms';

const GUIDE = [
  { title: 'Importación estándar', docs: ['Factura Comercial', 'Packing List', 'Bill of Lading / Airway Bill', 'Declaración Aduanera (DUA)', 'Certificado de Origen (si aplica)'] },
  { title: 'Exportación', docs: ['Factura Comercial', 'Packing List', 'Certificado de Origen', 'Declaración de exportación'] },
  { title: 'Alimentos y Productos Agrícolas', docs: ['Todo lo anterior', 'Certificado fitosanitario', 'Registro sanitario MSPAS'] },
];

export default function CustomsGuidePage() {
  const [hsCode, setHsCode] = useState('');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-navy-700 text-white py-12 text-center">
        <h1 className="text-3xl font-bold">Guía Aduanera Guatemala</h1>
        <p className="mt-2 text-navy-100">Información para importar y exportar sin complicaciones</p>
      </header>

      <main className="max-w-4xl mx-auto py-10 px-4 space-y-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-bold text-gray-800 mb-4">Calculadora de requisitos por código HS</h2>
          <div className="flex gap-3">
            <input value={hsCode} onChange={e => setHsCode(e.target.value)} placeholder="Ingresa código HS (ej. 6201)"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          {hsCode.length >= 2 && <HsCodeResult hsCode={hsCode} />}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {GUIDE.map(g => (
            <div key={g.title} className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-700 mb-3">{g.title}</h3>
              <ul className="space-y-2">
                {g.docs.map(d => <li key={d} className="text-sm text-gray-600 flex items-start gap-2"><span className="text-navy-700 mt-0.5">•</span>{d}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function HsCodeResult({ hsCode }: { hsCode: string }) {
  const { data, isLoading } = useHsCodeRequirements(hsCode);
  if (isLoading) return <p className="text-sm text-gray-400 mt-3">Buscando...</p>;
  if (!data?.requirements) return null;
  const req = data.requirements;
  return (
    <div className="mt-4 p-4 bg-navy-50 rounded-lg text-sm">
      <p className="font-semibold text-navy-700">{req.category} — Arancel: {req.tariffRate}%</p>
      {req.notes && <p className="text-amber-700 mt-1">{req.notes}</p>}
      <ul className="mt-2 space-y-1">
        {req.requiredDocs.map((d: string) => <li key={d} className="text-gray-600">• {d.replace(/_/g, ' ')}</li>)}
      </ul>
    </div>
  );
}
