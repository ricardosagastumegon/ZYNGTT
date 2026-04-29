'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Upload, Truck, FileText, CheckCircle2, ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react';

type WizardStep = 1 | 2 | 3 | 4;

interface CFDIPreview {
  expNombre: string;
  expRFC: string;
  impNombre: string;
  totalUSD: number;
  mercancias: { fraccion: string; nombre?: string; cantidadKG: number; labRequerido?: boolean }[];
  tributos: { cifUSD: number; daiGTQ: number; ivaGTQ: number; totalTributosGTQ: number };
  expedienteId: string;
  shipmentId: string;
}

interface TransportForm {
  transporteEmpresa: string;
  transporteCAAT: string;
  pilotoNombre: string;
  pilotoLicencia: string;
  cabezalPlaca: string;
  cabezalTarjeta: string;
  furgonPlaca: string;
  furgonTarjeta: string;
  numEconomico: string;
  fleteCosto: string;
  aduanaSalidaMX: string;
  aduanaEntradaGT: string;
  fechaCruce: string;
}

const STEPS = [
  { n: 1, label: 'CFDI', icon: Upload },
  { n: 2, label: 'Transporte', icon: Truck },
  { n: 3, label: 'Documentos', icon: FileText },
  { n: 4, label: 'Confirmar', icon: CheckCircle2 },
];

export default function NewImportPage() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1
  const [cfdiFile, setCfdiFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CFDIPreview | null>(null);

  // Step 2
  const [transport, setTransport] = useState<TransportForm>({
    transporteEmpresa: '', transporteCAAT: '', pilotoNombre: '', pilotoLicencia: '',
    cabezalPlaca: '', cabezalTarjeta: '', furgonPlaca: '', furgonTarjeta: '',
    numEconomico: '', fleteCosto: '350', aduanaSalidaMX: 'ADUANA SUCHIATE II',
    aduanaEntradaGT: 'ADUANA TECUN UMAN II', fechaCruce: '',
  });

  // Step 3
  const [fitoFile, setFitoFile] = useState<File | null>(null);
  const [labFile, setLabFile] = useState<File | null>(null);
  const [docsGenerated, setDocsGenerated] = useState(false);

  async function handleCFDIUpload() {
    if (!cfdiFile) { setError('Selecciona el archivo CFDI XML'); return; }
    setLoading(true); setError('');
    try {
      const form = new FormData();
      form.append('cfdi', cfdiFile);
      const res = await api.post('/api/import/parse-cfdi', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const exp = res.data.data;
      const tributesRes = await api.get(`/api/import/${exp.id}/tributes`);
      setPreview({ ...exp, tributos: tributesRes.data.data });
      setStep(2);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      setError(err.response?.data?.error ?? err.message ?? 'Error al procesar CFDI');
    } finally { setLoading(false); }
  }

  async function handleTransportSave() {
    if (!preview) return;
    setLoading(true); setError('');
    try {
      await api.post(`/api/import/transport/${preview.expedienteId}`, {
        ...transport, fleteCosto: parseFloat(transport.fleteCosto) || 350,
      });
      setStep(3);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      setError(err.response?.data?.error ?? 'Error al guardar transporte');
    } finally { setLoading(false); }
  }

  async function handleGenerateDocs() {
    if (!preview) return;
    setLoading(true); setError('');
    try {
      await api.post(`/api/import/generate-docs/${preview.expedienteId}`);
      if (fitoFile) {
        const f = new FormData(); f.append('fito', fitoFile);
        await api.post(`/api/import/fito-mx/${preview.expedienteId}`, f, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      if (labFile) {
        const f = new FormData(); f.append('lab', labFile);
        await api.post(`/api/import/lab/${preview.expedienteId}`, f, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setDocsGenerated(true);
      setStep(4);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      setError(err.response?.data?.error ?? 'Error al generar documentos');
    } finally { setLoading(false); }
  }

  function handleFinish() {
    if (preview) router.push(`/import/${preview.expedienteId}`);
  }

  const needsLab = preview?.mercancias?.some((m) => m.labRequerido);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
          Nueva Importación MX → GT
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Completa los 4 pasos para gestionar tu expediente de importación
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map(({ n, label, icon: Icon }, i) => (
          <div key={n} className="flex items-center">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              step === n ? 'text-white' : step > n ? 'text-green-600' : 'text-gray-400'
            }`} style={step === n ? { background: 'var(--brand-primary)' } : {}}>
              <Icon size={15} />
              <span>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <ChevronRight size={16} className="text-gray-300 mx-1" />
            )}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ background: '#FEE2E2', color: 'var(--danger)' }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* STEP 1 — CFDI */}
      {step === 1 && (
        <div className="rounded-xl border bg-white p-6 space-y-4" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="font-semibold text-lg">Paso 1: Cargar CFDI de Exportación</h2>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              Archivo CFDI 4.0 (XML)
            </label>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer hover:bg-gray-50 transition"
              style={{ borderColor: 'var(--color-border)' }}>
              <Upload size={24} className="mb-2 text-gray-400" />
              <span className="text-sm text-gray-500">{cfdiFile ? cfdiFile.name : 'Click o arrastra el archivo XML'}</span>
              <input type="file" accept=".xml" className="hidden" onChange={e => setCfdiFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>

          <button onClick={handleCFDIUpload} disabled={loading || !cfdiFile}
            className="w-full py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50 transition"
            style={{ background: 'var(--brand-primary)' }}>
            {loading ? 'Procesando CFDI...' : 'Procesar CFDI →'}
          </button>
        </div>
      )}

      {/* STEP 2 — Transporte */}
      {step === 2 && preview && (
        <div className="rounded-xl border bg-white p-6 space-y-4" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="font-semibold text-lg">Paso 2: Datos de Transporte</h2>

          {/* CFDI summary */}
          <div className="rounded-lg p-3 text-sm space-y-1" style={{ background: 'var(--neutral-50)', borderColor: 'var(--color-border)', border: '1px solid' }}>
            <p><span className="font-medium">Exportador:</span> {preview.expNombre} ({preview.expRFC})</p>
            <p><span className="font-medium">Importador:</span> {preview.impNombre}</p>
            <div className="flex gap-4 flex-wrap mt-2">
              {preview.mercancias?.map((m, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: m.labRequerido ? '#FEF9C3' : 'var(--neutral-100)', color: m.labRequerido ? 'var(--warning)' : 'var(--color-text-secondary)' }}>
                  {m.nombre || m.fraccion} · {m.cantidadKG}kg {m.labRequerido ? '⚠️ Lab' : ''}
                </span>
              ))}
            </div>
            <p className="font-medium mt-2" style={{ fontFamily: 'var(--font-mono)' }}>
              Total: ${preview.totalUSD?.toLocaleString()} USD · DAI: Q{preview.tributos?.daiGTQ?.toFixed(2)} · IVA: Q{preview.tributos?.ivaGTQ?.toFixed(2)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {([
              ['transporteEmpresa', 'Empresa Transportista'],
              ['transporteCAAT', 'No. CAAT'],
              ['pilotoNombre', 'Nombre del Piloto'],
              ['pilotoLicencia', 'Licencia del Piloto'],
              ['cabezalPlaca', 'Placa Cabezal'],
              ['cabezalTarjeta', 'Tarjeta de Circulación Cabezal'],
              ['furgonPlaca', 'Placa Furgón'],
              ['furgonTarjeta', 'Tarjeta de Circulación Furgón'],
              ['numEconomico', 'No. Económico'],
              ['fleteCosto', 'Costo del Flete (USD)'],
            ] as [keyof TransportForm, string][]).map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>{label}</label>
                <input type={key === 'fleteCosto' ? 'number' : 'text'}
                  value={transport[key]}
                  onChange={e => setTransport(p => ({ ...p, [key]: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  style={{ borderColor: 'var(--color-border)' }} />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Aduana Salida MX</label>
              <select value={transport.aduanaSalidaMX}
                onChange={e => setTransport(p => ({ ...p, aduanaSalidaMX: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: 'var(--color-border)' }}>
                <option>ADUANA SUCHIATE II</option>
                <option>ADUANA SUCHIATE I</option>
                <option>ADUANA CIUDAD HIDALGO</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Aduana Entrada GT</label>
              <select value={transport.aduanaEntradaGT}
                onChange={e => setTransport(p => ({ ...p, aduanaEntradaGT: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: 'var(--color-border)' }}>
                <option>ADUANA TECUN UMAN II</option>
                <option>ADUANA TECUN UMAN I</option>
                <option>ADUANA EL CARMEN</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Fecha Estimada de Cruce</label>
              <input type="date" value={transport.fechaCruce}
                onChange={e => setTransport(p => ({ ...p, fechaCruce: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: 'var(--color-border)' }} />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)}
              className="flex items-center gap-1 px-4 py-2 border rounded-lg text-sm transition hover:bg-gray-50"
              style={{ borderColor: 'var(--color-border)' }}>
              <ChevronLeft size={15} /> Atrás
            </button>
            <button onClick={handleTransportSave} disabled={loading}
              className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50 transition"
              style={{ background: 'var(--brand-primary)' }}>
              {loading ? 'Guardando...' : 'Guardar y Continuar →'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 — Documentos */}
      {step === 3 && preview && (
        <div className="rounded-xl border bg-white p-6 space-y-4" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="font-semibold text-lg">Paso 3: Documentos</h2>

          <div className="p-3 rounded-lg text-sm" style={{ background: 'var(--neutral-50)' }}>
            <p className="font-medium mb-1">Documentos a generar automáticamente:</p>
            <ul className="space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
              <li>✅ Carta Porte Terrestre (México)</li>
              <li>✅ Carta Porte Terrestre (Guatemala)</li>
              <li>✅ Packing List</li>
            </ul>
          </div>

          {/* Fitosanitario MX */}
          <div>
            <label className="block text-sm font-medium mb-1">Certificado Fitosanitario MX (PDF)</label>
            <label className="flex items-center gap-2 px-4 py-2.5 border rounded-lg cursor-pointer hover:bg-gray-50 transition text-sm"
              style={{ borderColor: 'var(--color-border)' }}>
              <Upload size={15} className="text-gray-400" />
              {fitoFile ? fitoFile.name : 'Seleccionar archivo fito MX'}
              <input type="file" accept=".pdf,.jpg,.png" className="hidden"
                onChange={e => setFitoFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>

          {/* Lab — condicional */}
          {needsLab && (
            <div className="p-3 rounded-lg border" style={{ borderColor: '#FDE68A', background: '#FFFBEB' }}>
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--warning)' }}>
                ⚠️ Este producto requiere análisis de laboratorio
              </p>
              <label className="flex items-center gap-2 px-4 py-2.5 border rounded-lg cursor-pointer hover:bg-yellow-50 transition text-sm"
                style={{ borderColor: '#FDE68A' }}>
                <Upload size={15} />
                {labFile ? labFile.name : 'Subir resultado de laboratorio'}
                <input type="file" accept=".pdf,.jpg,.png" className="hidden"
                  onChange={e => setLabFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(2)}
              className="flex items-center gap-1 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 transition"
              style={{ borderColor: 'var(--color-border)' }}>
              <ChevronLeft size={15} /> Atrás
            </button>
            <button onClick={handleGenerateDocs} disabled={loading}
              className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50 transition"
              style={{ background: 'var(--brand-primary)' }}>
              {loading ? 'Generando documentos...' : '📄 Generar documentos y continuar →'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4 — Confirmar */}
      {step === 4 && preview && (
        <div className="rounded-xl border bg-white p-6 space-y-4" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-center py-6">
            <CheckCircle2 className="w-14 h-14 mx-auto mb-3" style={{ color: 'var(--success)' }} />
            <h2 className="text-xl font-semibold">¡Expediente creado exitosamente!</h2>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
              Los documentos han sido generados. El siguiente paso es solicitar el permiso MAGA vía SIGIE.
            </p>
          </div>

          <div className="rounded-lg p-4 space-y-2 text-sm" style={{ background: 'var(--neutral-50)' }}>
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-text-secondary)' }}>Exportador</span>
              <span className="font-medium">{preview.expNombre}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-text-secondary)' }}>Importador</span>
              <span className="font-medium">{preview.impNombre}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-text-secondary)' }}>Total USD</span>
              <span className="font-bold" style={{ fontFamily: 'var(--font-mono)' }}>${preview.totalUSD?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-text-secondary)' }}>Tributos estimados</span>
              <span className="font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--warning)' }}>
                Q{preview.tributos?.totalTributosGTQ?.toFixed(2)}
              </span>
            </div>
          </div>

          <button onClick={handleFinish}
            className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition"
            style={{ background: 'var(--brand-primary)' }}>
            Ver expediente completo →
          </button>
        </div>
      )}
    </div>
  );
}
