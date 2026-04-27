'use client';

import { useState } from 'react';

interface DocItem {
  code: string;
  label: string;
  required: boolean;
  category: string;
}

interface Props {
  documents: DocItem[];
}

const CATEGORY_LABELS: Record<string, string> = {
  CFDI: 'CFDI / Factura',
  SANITARIO: 'Sanitario',
  ADUANA: 'Aduanero',
  SIGIE: 'SIGIE / MAGA',
  TRANSPORTE: 'Transporte',
};

export function DocumentChecklist({ documents }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const byCategory = documents.reduce<Record<string, DocItem[]>>((acc, d) => {
    (acc[d.category] ||= []).push(d);
    return acc;
  }, {});

  const total = documents.length;
  const done = Object.values(checked).filter(Boolean).length;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Checklist de Documentos</h3>
        <span className="text-sm text-gray-500">{done}/{total}</span>
      </div>

      <div className="h-1.5 w-full rounded-full bg-gray-100">
        <div
          className="h-1.5 rounded-full bg-green-500 transition-all"
          style={{ width: total ? `${(done / total) * 100}%` : '0%' }}
        />
      </div>

      <div className="space-y-4">
        {Object.entries(byCategory).map(([cat, docs]) => (
          <div key={cat}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {CATEGORY_LABELS[cat] ?? cat}
            </p>
            <ul className="space-y-2">
              {docs.map(doc => (
                <li key={doc.code} className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id={doc.code}
                    checked={!!checked[doc.code]}
                    onChange={e => setChecked(prev => ({ ...prev, [doc.code]: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-navy-600 focus:ring-navy-500"
                  />
                  <label htmlFor={doc.code} className="flex-1 cursor-pointer">
                    <span className={`text-sm ${checked[doc.code] ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {doc.label}
                    </span>
                    {doc.required && !checked[doc.code] && (
                      <span className="ml-2 text-xs font-medium text-red-500">Requerido</span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
