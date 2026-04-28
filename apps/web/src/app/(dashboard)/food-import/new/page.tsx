'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateFoodImport } from '@/hooks/useFoodImport';

const STEPS = ['CFDI', 'Logística', 'Importador', 'Confirmar'];
const INCOTERMS = ['FOB', 'CIF', 'CFR', 'EXW'];
const ENTRY_POINTS = [
  'Santo Tomás de Castilla',
  'Puerto Barrios',
  'La Mesilla',
  'El Carmen / Talismán',
  'Pedro de Alvarado',
  'Valle Nuevo',
  'Agua Caliente',
  'Aeropuerto La Aurora',
];

export default function NewFoodImportPage() {
  const router = useRouter();
  const { mutateAsync, isPending, error } = useCreateFoodImport();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [cfdiFile, setCfdiFile] = useState<File | null>(null);
  const [shipmentId, setShipmentId] = useState('');
  const [incoterm, setIncoterm] = useState('FOB');
  const [freight, setFreight] = useState('350');
  const [insurance, setInsurance] = useState('');
  const [importerNIT, setImporterNIT] = useState('');
  const [importerName, setImporterName] = useState('');
  const [pointOfEntry, setPointOfEntry] = useState(ENTRY_POINTS[0]);
  const [arrivalDate, setArrivalDate] = useState('');

  const canNext = [
    () => !!cfdiFile && !!shipmentId,
    () => !!incoterm && !!freight,
    () => !!importerNIT && !!importerName,
    () => true,
  ];

  const handleSubmit = async () => {
    if (!cfdiFile) return;
    const fd = new FormData();
    fd.append('cfdi', cfdiFile);
    fd.append('shipmentId', shipmentId);
    fd.append('incoterm', incoterm);
    fd.append('freightCostUSD', freight);
    if (insurance) fd.append('insuranceCostUSD', insurance);
    fd.append('importerNIT', importerNIT);
    fd.append('importerName', importerName);
    fd.append('pointOfEntry', pointOfEntry);
    if (arrivalDate) fd.append('expectedArrivalDate', arrivalDate);

    const record = await mutateAsync(fd);
    router.push(`/food-import/${record.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nueva Importación de Alimentos</h1>
        <p className="text-sm text-gray-500 mt-1">México → Guatemala · MAGA / SIGIE</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1">
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-semibold shrink-0 transition-colors
                ${i < step ? 'bg-green-500 text-white cursor-pointer'
                  : i === step ? 'bg-navy-700 text-white'
                  : 'bg-gray-200 text-gray-500 cursor-default'}`}
            >
              {i < step ? '✓' : i + 1}
            </button>
            <span className={`ml-2 text-xs font-medium hidden sm:block ${i === step ? 'text-navy-700' : 'text-gray-400'}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 ${i < step ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step panels */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
        {step === 0 && (
          <>
            <h2 className="font-semibold text-gray-900">1. Cargar CFDI XML</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID de Embarque</label>
              <input
                type="text"
                value={shipmentId}
                onChange={e => setShipmentId(e.target.value)}
                placeholder="ej. cm1abc..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Archivo CFDI (.xml)</label>
              <div
                onClick={() => fileRef.current?.click()}
                className={`flex flex-col items-center justify-center h-32 rounded-lg border-2 border-dashed cursor-pointer transition-colors
                  ${cfdiFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-navy-400 hover:bg-navy-50'}`}
              >
                {cfdiFile ? (
                  <>
                    <span className="text-2xl">✅</span>
                    <p className="mt-1 text-sm font-medium text-green-700">{cfdiFile.name}</p>
                    <p className="text-xs text-gray-500">{(cfdiFile.size / 1024).toFixed(1)} KB</p>
                  </>
                ) : (
                  <>
                    <span className="text-2xl">📄</span>
                    <p className="mt-1 text-sm text-gray-600">Haz clic para seleccionar el XML</p>
                    <p className="text-xs text-gray-400">CFDI 3.3 o 4.0 con complemento ComercioExterior</p>
                  </>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".xml"
                className="hidden"
                onChange={e => setCfdiFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="font-semibold text-gray-900">2. Datos Logísticos</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Incoterm</label>
                <select
                  value={incoterm}
                  onChange={e => setIncoterm(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                >
                  {INCOTERMS.map(i => <option key={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Flete (USD)</label>
                <input
                  type="number"
                  value={freight}
                  onChange={e => setFreight(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seguro (USD) <span className="text-gray-400">opcional</span></label>
                <input
                  type="number"
                  value={insurance}
                  onChange={e => setInsurance(e.target.value)}
                  placeholder="0.3% del valor"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha estimada llegada</label>
                <input
                  type="date"
                  value={arrivalDate}
                  onChange={e => setArrivalDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Puerto / Aduana de ingreso</label>
              <select
                value={pointOfEntry}
                onChange={e => setPointOfEntry(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
              >
                {ENTRY_POINTS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-semibold text-gray-900">3. Datos del Importador</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NIT del Importador</label>
                <input
                  type="text"
                  value={importerNIT}
                  onChange={e => setImporterNIT(e.target.value)}
                  placeholder="ej. 1234567-8"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre / Razón Social</label>
                <input
                  type="text"
                  value={importerName}
                  onChange={e => setImporterName(e.target.value)}
                  placeholder="ej. Distribuidora El Maíz S.A."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                />
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="font-semibold text-gray-900">4. Confirmar</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Archivo CFDI', cfdiFile?.name ?? '—'],
                ['Embarque ID', shipmentId],
                ['Incoterm', incoterm],
                ['Flete USD', `$${freight}`],
                ['Puerto', pointOfEntry],
                ['NIT Importador', importerNIT],
                ['Importador', importerName],
              ].map(([k, v]) => (
                <div key={k} className="rounded-md bg-gray-50 p-2.5">
                  <dt className="text-xs text-gray-500">{k}</dt>
                  <dd className="font-medium text-gray-900 mt-0.5 truncate">{v}</dd>
                </div>
              ))}
            </dl>
            {error && (
              <p className="text-sm text-red-600 rounded-md bg-red-50 px-3 py-2">
                {(error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al crear la importación'}
              </p>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
          className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
        >
          Atrás
        </button>
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canNext[step]()}
            className="rounded-lg px-5 py-2 text-sm font-semibold bg-navy-700 text-white hover:bg-navy-800 disabled:opacity-40"
          >
            Siguiente
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="rounded-lg px-5 py-2 text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
          >
            {isPending ? 'Procesando…' : 'Crear Importación'}
          </button>
        )}
      </div>
    </div>
  );
}
