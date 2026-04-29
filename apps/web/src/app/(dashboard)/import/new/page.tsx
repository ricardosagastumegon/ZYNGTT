'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
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
  transporteEmpresaId: string;
  pilotoId: string;
  cabezalId: string;
  cajaId: string;
  origenDireccion: string;
  origenCiudad: string;
  origenPais: string;
  destinoDireccion: string;
  destinoCiudad: string;
  destinoPais: string;
  fleteCosto: string;
  aduanaSalidaMX: string;
  aduanaEntradaGT: string;
  fechaCruce: string;
}

interface TransportEmpresa { id: string; nombre: string; CAAT: string }
interface Piloto { id: string; nombre: string; numLicencia: string }
interface Cabezal { id: string; placa: string; marca?: string }
interface Caja { id: string; placa: string; numEconomico?: string; tipo: string }

const STEPS = [
  { n: 1, label: 'CFDI', icon: Upload },
  { n: 2, label: 'Transporte', icon: Truck },
  { n: 3, label: 'Documentos', icon: FileText },
  { n: 4, label: 'Confirmar', icon: CheckCircle2 },
];

const ADUANAS_MX = ['ADUANA SUCHIATE II', 'ADUANA SUCHIATE I', 'ADUANA CIUDAD HIDALGO'];
const ADUANAS_GT = ['ADUANA TECUN UMAN II', 'ADUANA TECUN UMAN I', 'ADUANA EL CARMEN'];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium mb-1 text-gray-500">{children}</label>;
}

function SelectField({ value, onChange, disabled, children }: {
  value: string; onChange: (v: string) => void; disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-gray-50 disabled:text-gray-400">
      {children}
    </select>
  );
}

function TextField({ value, onChange, type = 'text', placeholder }: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
  );
}

export default function NewImportPage() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [cfdiFile, setCfdiFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CFDIPreview | null>(null);

  const [transport, setTransport] = useState<TransportForm>({
    transporteEmpresaId: '', pilotoId: '', cabezalId: '', cajaId: '',
    origenDireccion: '', origenCiudad: '', origenPais: 'MX',
    destinoDireccion: '', destinoCiudad: 'Ciudad de Guatemala', destinoPais: 'GT',
    fleteCosto: '350',
    aduanaSalidaMX: 'ADUANA SUCHIATE II',
    aduanaEntradaGT: 'ADUANA TECUN UMAN II',
    fechaCruce: '',
  });

  const setT = (key: keyof TransportForm) => (v: string) =>
    setTransport(p => ({ ...p, [key]: v }));

  const { data: empresas = [] } = useQuery<TransportEmpresa[]>({
    queryKey: ['transport-empresas'],
    queryFn: () => api.get('/api/transport/empresas').then(r => r.data.data),
    enabled: step === 2,
  });

  const selectedEmpresa = empresas.find(e => e.id === transport.transporteEmpresaId);

  const { data: pilotos = [] } = useQuery<Piloto[]>({
    queryKey: ['t-pilotos', transport.transporteEmpresaId],
    queryFn: () => api.get(`/api/transport/empresas/${transport.transporteEmpresaId}/pilotos`).then(r => r.data.data),
    enabled: !!transport.transporteEmpresaId,
  });

  const { data: cabezales = [] } = useQuery<Cabezal[]>({
    queryKey: ['t-cabezales', transport.transporteEmpresaId],
    queryFn: () => api.get(`/api/transport/empresas/${transport.transporteEmpresaId}/cabezales`).then(r => r.data.data),
    enabled: !!transport.transporteEmpresaId,
  });

  const { data: cajas = [] } = useQuery<Caja[]>({
    queryKey: ['t-cajas', transport.transporteEmpresaId],
    queryFn: () => api.get(`/api/transport/empresas/${transport.transporteEmpresaId}/cajas`).then(r => r.data.data),
    enabled: !!transport.transporteEmpresaId,
  });

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
        transporteEmpresaId: transport.transporteEmpresaId || undefined,
        pilotoId: transport.pilotoId || undefined,
        cabezalId: transport.cabezalId || undefined,
        cajaId: transport.cajaId || undefined,
        origenDireccion: transport.origenDireccion || undefined,
        origenCiudad: transport.origenCiudad || undefined,
        origenPais: transport.origenPais || undefined,
        destinoDireccion: transport.destinoDireccion || undefined,
        destinoCiudad: transport.destinoCiudad || undefined,
        destinoPais: transport.destinoPais || undefined,
        fleteCosto: parseFloat(transport.fleteCosto) || 350,
        aduanaSalidaMX: transport.aduanaSalidaMX || undefined,
        aduanaEntradaGT: transport.aduanaEntradaGT || undefined,
        fechaCruce: transport.fechaCruce || undefined,
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

  const [fitoFile, setFitoFile] = useState<File | null>(null);
  const [labFile, setLabFile] = useState<File | null>(null);
  const [docsGenerated, setDocsGenerated] = useState(false);
  const needsLab = preview?.mercancias?.some((m) => m.labRequerido);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
          Nueva Importación MX → GT
        </h1>
        <p className="text-sm mt-1 text-gray-500">
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
            {i < STEPS.length - 1 && <ChevronRight size={16} className="text-gray-300 mx-1" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg text-sm bg-red-50 text-red-600">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* STEP 1 — CFDI */}
      {step === 1 && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 space-y-4">
          <h2 className="font-semibold text-lg">Paso 1: Cargar CFDI de Exportación</h2>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-500">Archivo CFDI 4.0 (XML)</label>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition">
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
        <div className="rounded-xl border border-gray-100 bg-white p-6 space-y-5">
          <h2 className="font-semibold text-lg">Paso 2: Datos de Transporte</h2>

          {/* CFDI summary */}
          <div className="rounded-lg p-3 text-sm space-y-1 bg-gray-50 border border-gray-100">
            <p><span className="font-medium">Exportador:</span> {preview.expNombre} ({preview.expRFC})</p>
            <p><span className="font-medium">Importador:</span> {preview.impNombre}</p>
            <div className="flex gap-2 flex-wrap mt-2">
              {preview.mercancias?.map((m, i) => (
                <span key={i} className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.labRequerido ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                  {m.nombre || m.fraccion} · {m.cantidadKG}kg {m.labRequerido ? '⚠️ Lab' : ''}
                </span>
              ))}
            </div>
            <p className="font-medium mt-2 font-mono text-xs">
              Total: ${preview.totalUSD?.toLocaleString()} USD · DAI: Q{preview.tributos?.daiGTQ?.toFixed(2)} · IVA: Q{preview.tributos?.ivaGTQ?.toFixed(2)}
            </p>
          </div>

          {/* Empresa de transporte */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Empresa de Transporte</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <FieldLabel>Empresa Transportista</FieldLabel>
                <SelectField value={transport.transporteEmpresaId} onChange={v => {
                  setTransport(p => ({ ...p, transporteEmpresaId: v, pilotoId: '', cabezalId: '', cajaId: '' }));
                }}>
                  <option value="">Seleccionar empresa...</option>
                  {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </SelectField>
              </div>
              {selectedEmpresa && (
                <div className="col-span-2">
                  <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-lg text-sm">
                    <span className="text-indigo-500 font-medium">CAAT:</span>
                    <span className="font-mono text-indigo-700">{selectedEmpresa.CAAT}</span>
                  </div>
                </div>
              )}
              <div>
                <FieldLabel>Piloto</FieldLabel>
                <SelectField value={transport.pilotoId} onChange={setT('pilotoId')} disabled={!transport.transporteEmpresaId}>
                  <option value="">Seleccionar piloto...</option>
                  {pilotos.map(p => <option key={p.id} value={p.id}>{p.nombre} — {p.numLicencia}</option>)}
                </SelectField>
              </div>
              <div>
                <FieldLabel>Cabezal</FieldLabel>
                <SelectField value={transport.cabezalId} onChange={setT('cabezalId')} disabled={!transport.transporteEmpresaId}>
                  <option value="">Seleccionar cabezal...</option>
                  {cabezales.map(c => <option key={c.id} value={c.id}>{c.placa}{c.marca ? ` — ${c.marca}` : ''}</option>)}
                </SelectField>
              </div>
              <div>
                <FieldLabel>Caja / Furgón</FieldLabel>
                <SelectField value={transport.cajaId} onChange={setT('cajaId')} disabled={!transport.transporteEmpresaId}>
                  <option value="">Seleccionar caja...</option>
                  {cajas.map(c => <option key={c.id} value={c.id}>{c.placa}{c.numEconomico ? ` — #${c.numEconomico}` : ''} ({c.tipo})</option>)}
                </SelectField>
              </div>
            </div>
          </div>

          {/* Origen / Destino */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Origen y Destino</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-3 font-medium text-xs text-gray-400 uppercase">Origen (México)</div>
              <div className="col-span-2">
                <FieldLabel>Dirección de origen</FieldLabel>
                <TextField value={transport.origenDireccion} onChange={setT('origenDireccion')} placeholder="Calle, Colonia, No." />
              </div>
              <div>
                <FieldLabel>Ciudad</FieldLabel>
                <TextField value={transport.origenCiudad} onChange={setT('origenCiudad')} placeholder="Ej. Tapachula" />
              </div>

              <div className="col-span-3 font-medium text-xs text-gray-400 uppercase mt-2">Destino (Guatemala)</div>
              <div className="col-span-2">
                <FieldLabel>Dirección de destino</FieldLabel>
                <TextField value={transport.destinoDireccion} onChange={setT('destinoDireccion')} placeholder="Bodega, zona, municipio" />
              </div>
              <div>
                <FieldLabel>Ciudad</FieldLabel>
                <TextField value={transport.destinoCiudad} onChange={setT('destinoCiudad')} placeholder="Ej. Guatemala" />
              </div>
            </div>
          </div>

          {/* Aduana / Cruce */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Cruce Fronterizo</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Aduana Salida MX</FieldLabel>
                <SelectField value={transport.aduanaSalidaMX} onChange={setT('aduanaSalidaMX')}>
                  {ADUANAS_MX.map(a => <option key={a}>{a}</option>)}
                </SelectField>
              </div>
              <div>
                <FieldLabel>Aduana Entrada GT</FieldLabel>
                <SelectField value={transport.aduanaEntradaGT} onChange={setT('aduanaEntradaGT')}>
                  {ADUANAS_GT.map(a => <option key={a}>{a}</option>)}
                </SelectField>
              </div>
              <div>
                <FieldLabel>Fecha estimada de cruce</FieldLabel>
                <TextField value={transport.fechaCruce} onChange={setT('fechaCruce')} type="date" />
              </div>
              <div>
                <FieldLabel>Costo del flete (USD)</FieldLabel>
                <TextField value={transport.fleteCosto} onChange={setT('fleteCosto')} type="number" placeholder="350" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep(1)}
              className="flex items-center gap-1 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition">
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
        <div className="rounded-xl border border-gray-100 bg-white p-6 space-y-4">
          <h2 className="font-semibold text-lg">Paso 3: Documentos</h2>
          <div className="p-3 rounded-lg text-sm bg-gray-50">
            <p className="font-medium mb-1">Documentos a generar automáticamente:</p>
            <ul className="space-y-1 text-gray-500">
              <li>✅ Carta Porte Terrestre (México)</li>
              <li>✅ Carta Porte Terrestre (Guatemala)</li>
              <li>✅ Packing List</li>
            </ul>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Certificado Fitosanitario MX (PDF)</label>
            <label className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition text-sm">
              <Upload size={15} className="text-gray-400" />
              {fitoFile ? fitoFile.name : 'Seleccionar archivo fito MX'}
              <input type="file" accept=".pdf,.jpg,.png" className="hidden" onChange={e => setFitoFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          {needsLab && (
            <div className="p-3 rounded-lg border border-yellow-200 bg-yellow-50">
              <p className="text-sm font-medium mb-2 text-yellow-700">⚠️ Este producto requiere análisis de laboratorio</p>
              <label className="flex items-center gap-2 px-4 py-2.5 border border-yellow-200 rounded-lg cursor-pointer hover:bg-yellow-50 transition text-sm">
                <Upload size={15} />
                {labFile ? labFile.name : 'Subir resultado de laboratorio'}
                <input type="file" accept=".pdf,.jpg,.png" className="hidden" onChange={e => setLabFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => setStep(2)}
              className="flex items-center gap-1 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition">
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
        <div className="rounded-xl border border-gray-100 bg-white p-6 space-y-4">
          <div className="text-center py-6">
            <CheckCircle2 className="w-14 h-14 mx-auto mb-3 text-green-500" />
            <h2 className="text-xl font-semibold">¡Expediente creado exitosamente!</h2>
            <p className="text-sm mt-2 text-gray-500">
              Los documentos han sido generados. El siguiente paso es solicitar el permiso MAGA vía SIGIE.
            </p>
          </div>
          <div className="rounded-lg p-4 space-y-2 text-sm bg-gray-50">
            <div className="flex justify-between">
              <span className="text-gray-500">Exportador</span>
              <span className="font-medium">{preview.expNombre}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Importador</span>
              <span className="font-medium">{preview.impNombre}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total USD</span>
              <span className="font-bold font-mono">${preview.totalUSD?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tributos estimados</span>
              <span className="font-bold font-mono text-yellow-600">Q{preview.tributos?.totalTributosGTQ?.toFixed(2)}</span>
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
