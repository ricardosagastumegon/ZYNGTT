'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Upload, Truck, FileText, CheckCircle2, ChevronRight, ChevronLeft,
  AlertCircle, Leaf, Sprout, Loader2, ExternalLink, RefreshCw, Plus, Minus,
} from 'lucide-react';

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

interface MercanciaItem {
  fraccion: string;
  nombre: string;
  cantidadKG: number;
  cantidadBultos: number;
  tipoBulto: string;
  labRequerido?: boolean;
}

interface CFDIPreview {
  expedienteId: string;
  shipmentId: string;
  expNombre: string;
  expRFC: string;
  impNombre: string;
  cfdiFolio: string;
  totalUSD: number;
  mercancias: MercanciaItem[];
  tributos: { cifUSD: number; daiGTQ: number; ivaGTQ: number; totalTributosGTQ: number };
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

interface SIGIEForm {
  fraccionArancelaria: string;
  producto: string;
  pesoNetoKG: number;
  cantidadBultos: number;
  tipoBulto: string;
  licenciaSanitaria: string;
  temperatura: string;
  numCertFitoMX: string;
  numFactura: string;
  fechaEmbarque: string;
  fechaArriboEstimada: string;
  numContenedor: string;
  numLote: string;
  numCertInocuidad: string;
  numAnalisisLab: string;
}

interface SIGIEStatus {
  id?: string;
  fraccionArancelaria?: string | null;
  producto?: string;
  status: 'PENDIENTE' | 'SOLICITADO' | 'APROBADO' | 'RECHAZADO';
  permisoFitoNumero?: string | null;
  dictamenNumero?: string | null;
  controlElectronico?: string | null;
}

interface TransportEmpresa { id: string; nombre: string; CAAT: string }
interface Piloto { id: string; nombre: string; numLicencia: string }
interface Cabezal { id: string; placa: string; marca?: string }
interface Caja { id: string; placa: string; numEconomico?: string; tipo: string }

// ─── Step icons ─────────────────────────────────────────
const STEPS = [
  { n: 1, label: 'CFDI',       icon: Upload },
  { n: 2, label: 'Transporte', icon: Truck },
  { n: 3, label: 'Documentos', icon: FileText },
  { n: 4, label: 'Fito MX',   icon: Leaf },
  { n: 5, label: 'MAGA/SIGIE',icon: Sprout },
  { n: 6, label: 'Confirmar',  icon: CheckCircle2 },
] as const;

const ADUANAS_GT = ['ADUANA TECUN UMAN II', 'ADUANA TECUN UMAN I', 'ADUANA EL CARMEN'];
const TIPOS_BULTO = ['CAJA', 'SACO', 'ARPILLA', 'PALLET', 'BULTO', 'CARTÓN'];

// ─── Helpers ─────────────────────────────────────────────
function FL({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return <label htmlFor={htmlFor} className="block text-xs font-medium text-gray-500 mb-1">{children}</label>;
}
function TI({ id, value, onChange, placeholder, type = 'text', disabled, readOnly }: {
  id?: string; value: string; onChange?: (v: string) => void; placeholder?: string;
  type?: string; disabled?: boolean; readOnly?: boolean;
}) {
  return (
    <input
      id={id} type={type} value={value} placeholder={placeholder}
      readOnly={readOnly} disabled={disabled}
      onChange={e => onChange?.(e.target.value)}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-gray-50 read-only:bg-gray-50 read-only:text-gray-500"
    />
  );
}
function SI({ value, onChange, disabled, children }: {
  value: string; onChange: (v: string) => void; disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-gray-50 disabled:text-gray-400">
      {children}
    </select>
  );
}

// ─── Main ─────────────────────────────────────────────────
export default function NewImportPage() {
  const router = useRouter();
  const [step, setStep]     = useState<WizardStep>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  // Step 1
  const [cfdiFile, setCfdiFile]     = useState<File | null>(null);
  const [preview, setPreview]       = useState<CFDIPreview | null>(null);
  const [mercancias, setMercancias] = useState<MercanciaItem[]>([]);

  // Step 2
  const [transport, setTransport] = useState<TransportForm>({
    transporteEmpresaId: '', pilotoId: '', cabezalId: '', cajaId: '',
    origenDireccion: '', origenCiudad: '', origenPais: 'MX',
    destinoDireccion: '', destinoCiudad: 'Ciudad de Guatemala', destinoPais: 'GT',
    fleteCosto: '350', aduanaSalidaMX: 'ADUANA SUCHIATE II',
    aduanaEntradaGT: 'ADUANA TECUN UMAN II', fechaCruce: '',
  });
  const setT = (k: keyof TransportForm) => (v: string) => setTransport(p => ({ ...p, [k]: v }));

  // Step 3
  const [docs, setDocs] = useState<{ cartaPorteMXUrl?: string; cartaPorteGTUrl?: string; packingListUrl?: string } | null>(null);

  // Step 4
  const [fitoFile, setFitoFile]       = useState<File | null>(null);
  const [labFile, setLabFile]         = useState<File | null>(null);
  const [fitoMXNumero, setFitoMXNumero] = useState('');
  const [fitoFecha, setFitoFecha]     = useState('');
  const [fitoUploaded, setFitoUploaded] = useState(false);

  // Step 5
  const [sigieForms, setSigieForms]     = useState<Record<string, SIGIEForm>>({});
  const [sigieStatuses, setSigieStatuses] = useState<Record<string, SIGIEStatus>>({});
  const [sigieLoading, setSigieLoading] = useState<Record<string, boolean>>({});

  // Transport catalog queries (step 2)
  const { data: empresas = [] } = useQuery<TransportEmpresa[]>({
    queryKey: ['transport-empresas'],
    queryFn: () => api.get('/api/transport/empresas').then(r => r.data.data),
    enabled: step === 2,
  });
  const selectedEmpresa = empresas.find(e => e.id === transport.transporteEmpresaId);

  const { data: pilotos = [] }   = useQuery<Piloto[]>({
    queryKey: ['t-pilotos', transport.transporteEmpresaId],
    queryFn: () => api.get(`/api/transport/empresas/${transport.transporteEmpresaId}/pilotos`).then(r => r.data.data),
    enabled: !!transport.transporteEmpresaId && step === 2,
  });
  const { data: cabezales = [] } = useQuery<Cabezal[]>({
    queryKey: ['t-cabezales', transport.transporteEmpresaId],
    queryFn: () => api.get(`/api/transport/empresas/${transport.transporteEmpresaId}/cabezales`).then(r => r.data.data),
    enabled: !!transport.transporteEmpresaId && step === 2,
  });
  const { data: cajas = [] }     = useQuery<Caja[]>({
    queryKey: ['t-cajas', transport.transporteEmpresaId],
    queryFn: () => api.get(`/api/transport/empresas/${transport.transporteEmpresaId}/cajas`).then(r => r.data.data),
    enabled: !!transport.transporteEmpresaId && step === 2,
  });
  const selectedCaja = cajas.find(c => c.id === transport.cajaId);

  // Initialize SIGIE forms when entering step 5
  useEffect(() => {
    if (step !== 5 || !preview) return;
    setSigieForms(prev => {
      const next = { ...prev };
      mercancias.forEach(m => {
        if (!next[m.fraccion]) {
          next[m.fraccion] = {
            fraccionArancelaria: m.fraccion,
            producto: m.nombre || m.fraccion,
            pesoNetoKG: m.cantidadKG,
            cantidadBultos: m.cantidadBultos || 1,
            tipoBulto: m.tipoBulto || 'CAJA',
            licenciaSanitaria: '',
            temperatura: 'N/A',
            numCertFitoMX: fitoMXNumero,
            numFactura: preview.cfdiFolio ?? '',
            fechaEmbarque: transport.fechaCruce ?? '',
            fechaArriboEstimada: '',
            numContenedor: selectedCaja?.numEconomico ?? selectedCaja?.placa ?? '',
            numLote: '',
            numCertInocuidad: '',
            numAnalisisLab: '',
          };
        }
      });
      return next;
    });
    loadSigieStatuses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const loadSigieStatuses = useCallback(async () => {
    if (!preview) return;
    try {
      const res = await api.get(`/api/automation/sigie/${preview.expedienteId}`);
      const permisos: SIGIEStatus[] = res.data.data?.sigiePermisos ?? [];
      const next: Record<string, SIGIEStatus> = {};
      for (const p of permisos) {
        const key = p.fraccionArancelaria ?? p.producto ?? '';
        if (key) next[key] = p;
      }
      setSigieStatuses(prev => ({ ...prev, ...next }));
    } catch { /* ignore */ }
  }, [preview]);

  const needsLab = mercancias.some(m => m.labRequerido);
  const allSigieApproved = mercancias.length > 0 &&
    mercancias.every(m => sigieStatuses[m.fraccion]?.status === 'APROBADO');

  // ─── Handlers ─────────────────────────────────────────

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
      const cfdiPreview: CFDIPreview = {
        ...exp,
        expedienteId: exp.id,
        tributos: tributesRes.data.data,
      };
      setPreview(cfdiPreview);
      setMercancias(
        (exp.mercancias ?? []).map((m: Record<string, unknown>) => ({
          fraccion: (m.fraccion as string) ?? '',
          nombre: (m.nombre as string) ?? (m.descripcion as string) ?? '',
          cantidadKG: Number(m.cantidadKG) || 0,
          cantidadBultos: Number(m.cantidadBultos) || 1,
          tipoBulto: (m.tipoBulto as string) || 'CAJA',
          labRequerido: Boolean(m.labRequerido),
        }))
      );
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
        pilotoId:  transport.pilotoId  || undefined,
        cabezalId: transport.cabezalId || undefined,
        cajaId:    transport.cajaId    || undefined,
        origenDireccion: transport.origenDireccion || undefined,
        origenCiudad:    transport.origenCiudad    || undefined,
        origenPais:      transport.origenPais       || undefined,
        destinoDireccion: transport.destinoDireccion || undefined,
        destinoCiudad:    transport.destinoCiudad    || undefined,
        destinoPais:      transport.destinoPais      || undefined,
        fleteCosto:    parseFloat(transport.fleteCosto) || 350,
        aduanaSalidaMX: transport.aduanaSalidaMX || undefined,
        aduanaEntradaGT: transport.aduanaEntradaGT || undefined,
        fechaCruce:    transport.fechaCruce || undefined,
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
      const res = await api.post(`/api/import/generate-docs/${preview.expedienteId}`);
      const d = res.data.data;
      setDocs({
        cartaPorteMXUrl: d.cartaPorteMXUrl,
        cartaPorteGTUrl: d.cartaPorteGTUrl,
        packingListUrl:  d.packingListUrl,
      });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      setError(err.response?.data?.error ?? 'Error al generar documentos');
    } finally { setLoading(false); }
  }

  async function handleFitoUpload() {
    if (!preview) return;
    setLoading(true); setError('');
    try {
      if (fitoFile) {
        const f = new FormData();
        f.append('fito', fitoFile);
        if (fitoMXNumero) f.append('fitoMXNumero', fitoMXNumero);
        if (fitoFecha)    f.append('fitoMXFecha',  fitoFecha);
        await api.post(`/api/import/fito-mx/${preview.expedienteId}`, f, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      if (labFile) {
        const f = new FormData();
        f.append('lab', labFile);
        await api.post(`/api/import/lab/${preview.expedienteId}`, f, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setFitoUploaded(true);
      setStep(5);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      setError(err.response?.data?.error ?? 'Error al subir fitosanitario');
    } finally { setLoading(false); }
  }

  async function handleSolicitarSIGIE(fraccion: string) {
    if (!preview) return;
    const form = sigieForms[fraccion];
    if (!form) return;
    setSigieLoading(p => ({ ...p, [fraccion]: true }));
    setError('');
    try {
      const permisoRes = await api.post(`/api/import/sigie-permiso/${preview.expedienteId}`, form);
      const permisoId = permisoRes.data.data.id;
      setSigieStatuses(p => ({ ...p, [fraccion]: { id: permisoId, status: 'PENDIENTE', fraccionArancelaria: fraccion } }));
      await api.post(`/api/automation/sigie/${preview.expedienteId}`);
      setSigieStatuses(p => ({ ...p, [fraccion]: { ...p[fraccion], status: 'SOLICITADO' } }));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      setError(err.response?.data?.error ?? 'Error al solicitar SIGIE');
    } finally {
      setSigieLoading(p => ({ ...p, [fraccion]: false }));
    }
  }

  function setSigieField(fraccion: string, key: keyof SIGIEForm, value: string | number) {
    setSigieForms(p => ({ ...p, [fraccion]: { ...p[fraccion], [key]: value } }));
  }

  // ─────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
          Nueva Importación MX → GT
        </h1>
        <p className="text-sm mt-1 text-gray-500">
          Completa los 6 pasos para gestionar tu expediente de importación
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center flex-wrap gap-1">
        {STEPS.map(({ n, label, icon: Icon }, i) => (
          <div key={n} className="flex items-center">
            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
              step === n ? 'text-white' : step > n ? 'text-green-600' : 'text-gray-400'
            }`} style={step === n ? { background: 'var(--brand-primary)' } : {}}>
              {step > n
                ? <CheckCircle2 size={13} className="text-green-500" />
                : <Icon size={13} />}
              <span>{label}</span>
            </div>
            {i < STEPS.length - 1 && <ChevronRight size={14} className="text-gray-300 mx-0.5" />}
          </div>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg text-sm bg-red-50 text-red-600 border border-red-100">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          STEP 1 — CFDI
      ═══════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 space-y-5">
          <h2 className="font-semibold text-lg">Paso 1: Cargar CFDI de Exportación</h2>

          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition">
            <Upload size={24} className="mb-2 text-gray-400" />
            <span className="text-sm text-gray-500">{cfdiFile ? cfdiFile.name : 'Click o arrastra el archivo XML'}</span>
            <input type="file" accept=".xml" className="hidden" onChange={e => setCfdiFile(e.target.files?.[0] ?? null)} />
          </label>

          {/* Editable mercancias preview (shown after re-visit via back button) */}
          {mercancias.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Productos detectados</p>
              {mercancias.map((m, idx) => (
                <div key={m.fraccion} className="border border-gray-100 rounded-lg p-3 grid grid-cols-5 gap-2 items-end text-sm">
                  <div className="col-span-2">
                    <FL>Producto / Fracción</FL>
                    <p className="font-medium text-gray-800 truncate">{m.nombre || m.fraccion}</p>
                    <p className="text-xs text-gray-400 font-mono">{m.fraccion}</p>
                  </div>
                  <div>
                    <FL>Kg</FL>
                    <input type="number" value={m.cantidadKG}
                      onChange={e => setMercancias(prev => prev.map((x, i) => i === idx ? { ...x, cantidadKG: Number(e.target.value) } : x))}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  </div>
                  <div>
                    <FL>Bultos</FL>
                    <input type="number" value={m.cantidadBultos}
                      onChange={e => setMercancias(prev => prev.map((x, i) => i === idx ? { ...x, cantidadBultos: Number(e.target.value) } : x))}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  </div>
                  <div>
                    <FL>Tipo bulto</FL>
                    <select value={m.tipoBulto}
                      onChange={e => setMercancias(prev => prev.map((x, i) => i === idx ? { ...x, tipoBulto: e.target.value } : x))}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none">
                      {TIPOS_BULTO.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button onClick={handleCFDIUpload} disabled={loading || !cfdiFile}
            className="w-full py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50 transition"
            style={{ background: 'var(--brand-primary)' }}>
            {loading ? <span className="flex items-center justify-center gap-2"><Loader2 size={15} className="animate-spin" /> Procesando...</span> : 'Procesar CFDI →'}
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          STEP 2 — Transporte
      ═══════════════════════════════════════════════ */}
      {step === 2 && preview && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 space-y-5">
          <h2 className="font-semibold text-lg">Paso 2: Datos de Transporte</h2>

          {/* CFDI summary */}
          <div className="rounded-lg p-3 text-sm bg-gray-50 border border-gray-100 space-y-1">
            <p><span className="font-medium">Exportador:</span> {preview.expNombre}</p>
            <div className="flex gap-2 flex-wrap mt-1">
              {mercancias.map(m => (
                <span key={m.fraccion} className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.labRequerido ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                  {m.nombre || m.fraccion} · {m.cantidadKG.toLocaleString()}kg · {m.cantidadBultos} {m.tipoBulto}
                </span>
              ))}
            </div>
          </div>

          {/* Empresa */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Empresa de Transporte</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <FL>Empresa Transportista</FL>
                <SI value={transport.transporteEmpresaId} onChange={v => setTransport(p => ({ ...p, transporteEmpresaId: v, pilotoId: '', cabezalId: '', cajaId: '' }))}>
                  <option value="">Seleccionar empresa...</option>
                  {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </SI>
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
                <FL>Piloto</FL>
                <SI value={transport.pilotoId} onChange={setT('pilotoId')} disabled={!transport.transporteEmpresaId}>
                  <option value="">Seleccionar piloto...</option>
                  {pilotos.map(p => <option key={p.id} value={p.id}>{p.nombre} — {p.numLicencia}</option>)}
                </SI>
              </div>
              <div>
                <FL>Cabezal</FL>
                <SI value={transport.cabezalId} onChange={setT('cabezalId')} disabled={!transport.transporteEmpresaId}>
                  <option value="">Seleccionar cabezal...</option>
                  {cabezales.map(c => <option key={c.id} value={c.id}>{c.placa}{c.marca ? ` — ${c.marca}` : ''}</option>)}
                </SI>
              </div>
              <div>
                <FL>Caja / Furgón</FL>
                <SI value={transport.cajaId} onChange={setT('cajaId')} disabled={!transport.transporteEmpresaId}>
                  <option value="">Seleccionar caja...</option>
                  {cajas.map(c => <option key={c.id} value={c.id}>{c.placa}{c.numEconomico ? ` — #${c.numEconomico}` : ''} ({c.tipo})</option>)}
                </SI>
              </div>
            </div>
          </div>

          {/* Origen / Destino */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Origen y Destino</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-3 text-xs text-gray-400 font-medium uppercase">Origen (México)</div>
              <div className="col-span-2">
                <FL>Dirección</FL>
                <TI value={transport.origenDireccion} onChange={setT('origenDireccion')} placeholder="Calle, Colonia, No." />
              </div>
              <div>
                <FL>Ciudad</FL>
                <TI value={transport.origenCiudad} onChange={setT('origenCiudad')} placeholder="Tapachula" />
              </div>
              <div className="col-span-3 text-xs text-gray-400 font-medium uppercase mt-1">Destino (Guatemala)</div>
              <div className="col-span-2">
                <FL>Dirección</FL>
                <TI value={transport.destinoDireccion} onChange={setT('destinoDireccion')} placeholder="Bodega, zona, municipio" />
              </div>
              <div>
                <FL>Ciudad</FL>
                <TI value={transport.destinoCiudad} onChange={setT('destinoCiudad')} placeholder="Guatemala" />
              </div>
            </div>
          </div>

          {/* Aduanas */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cruce Fronterizo</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <FL>Aduana Entrada GT</FL>
                <SI value={transport.aduanaEntradaGT} onChange={setT('aduanaEntradaGT')}>
                  {ADUANAS_GT.map(a => <option key={a}>{a}</option>)}
                </SI>
              </div>
              <div>
                <FL>Fecha estimada de cruce</FL>
                <TI value={transport.fechaCruce} onChange={setT('fechaCruce')} type="date" />
              </div>
              <div>
                <FL>Costo del flete (USD)</FL>
                <TI value={transport.fleteCosto} onChange={setT('fleteCosto')} type="number" placeholder="350" />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex items-center gap-1 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
              <ChevronLeft size={15} /> Atrás
            </button>
            <button onClick={handleTransportSave} disabled={loading}
              className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              style={{ background: 'var(--brand-primary)' }}>
              {loading ? 'Guardando...' : 'Guardar y Continuar →'}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          STEP 3 — Documentos
      ═══════════════════════════════════════════════ */}
      {step === 3 && preview && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 space-y-5">
          <h2 className="font-semibold text-lg">Paso 3: Generación de Documentos</h2>

          <div className="rounded-lg p-3 text-sm bg-amber-50 border border-amber-100 text-amber-700">
            <p className="font-medium">ℹ️ Estos documentos son necesarios para el SIGIE</p>
            <p className="text-xs mt-0.5 text-amber-600">El número de Carta Porte y Packing List se adjuntan a la solicitud MAGA.</p>
          </div>

          {!docs ? (
            <button onClick={handleGenerateDocs} disabled={loading}
              className="w-full py-3 rounded-lg text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'var(--brand-primary)' }}>
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> Generando documentos...</>
                : <><FileText size={15} /> Generar documentos automáticamente</>}
            </button>
          ) : (
            <div className="space-y-2">
              {[
                { label: 'Packing List',       url: docs.packingListUrl },
                { label: 'Carta Porte MX',     url: docs.cartaPorteMXUrl },
                { label: 'Carta Porte GT',     url: docs.cartaPorteGTUrl },
              ].map(({ label, url }) => (
                <div key={label} className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-green-500" />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  {url && (
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                      <ExternalLink size={12} /> Ver
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="flex items-center gap-1 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
              <ChevronLeft size={15} /> Atrás
            </button>
            <button onClick={() => setStep(4)} disabled={!docs}
              className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              style={{ background: 'var(--brand-primary)' }}>
              Continuar →
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          STEP 4 — Fito MX
      ═══════════════════════════════════════════════ */}
      {step === 4 && preview && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 space-y-5">
          <h2 className="font-semibold text-lg">Paso 4: Certificado Fitosanitario México</h2>

          {/* Fito upload */}
          <div>
            <FL>Archivo PDF — Certificado SENASICA</FL>
            <label className="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition text-sm">
              <Leaf size={16} className="text-green-500" />
              <span className={fitoFile ? 'text-gray-800' : 'text-gray-400'}>
                {fitoFile ? fitoFile.name : 'Seleccionar certificado fitosanitario MX (PDF)'}
              </span>
              <input type="file" accept=".pdf,.jpg,.png" className="hidden" onChange={e => setFitoFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>

          {/* Datos del certificado */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FL>Número de certificado</FL>
              <TI value={fitoMXNumero} onChange={setFitoMXNumero} placeholder="Ej. E-26-0050997" />
            </div>
            <div>
              <FL>Fecha del certificado</FL>
              <TI value={fitoFecha} onChange={setFitoFecha} type="date" />
            </div>
          </div>

          {/* Lab — solo si aplica */}
          {needsLab && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 space-y-3">
              <p className="text-sm font-medium text-yellow-700">⚠️ Producto requiere análisis de laboratorio</p>
              <label className="flex items-center gap-2 px-4 py-2.5 border border-yellow-200 rounded-lg cursor-pointer hover:bg-yellow-50 transition text-sm">
                <Upload size={14} />
                {labFile ? labFile.name : 'Subir resultado de laboratorio (PDF)'}
                <input type="file" accept=".pdf,.jpg,.png" className="hidden" onChange={e => setLabFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          )}

          {/* Productos detectados (readonly) */}
          <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 space-y-1">
            <p className="text-xs font-medium text-gray-500 mb-2">Productos del CFDI</p>
            {mercancias.map(m => (
              <div key={m.fraccion} className="flex justify-between text-sm">
                <span className="text-gray-700">{m.nombre || m.fraccion}</span>
                <span className="text-gray-400 font-mono text-xs">{m.cantidadKG.toLocaleString()} kg · {m.cantidadBultos} {m.tipoBulto}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(3)} className="flex items-center gap-1 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
              <ChevronLeft size={15} /> Atrás
            </button>
            <button onClick={handleFitoUpload} disabled={loading}
              className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              style={{ background: 'var(--brand-primary)' }}>
              {loading ? 'Subiendo...' : 'Guardar y Continuar →'}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          STEP 5 — MAGA / SIGIE
      ═══════════════════════════════════════════════ */}
      {step === 5 && preview && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-100 bg-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-lg">Paso 5: Solicitud MAGA / SIGIE</h2>
                <p className="text-xs text-gray-400 mt-0.5">Completa y envía una solicitud por producto</p>
              </div>
              <button onClick={loadSigieStatuses}
                className="flex items-center gap-1.5 text-xs text-indigo-600 hover:underline px-3 py-1.5 rounded-lg hover:bg-indigo-50">
                <RefreshCw size={12} /> Actualizar estados
              </button>
            </div>
          </div>

          {mercancias.map(m => {
            const form    = sigieForms[m.fraccion];
            const status  = sigieStatuses[m.fraccion];
            const pending = sigieLoading[m.fraccion];
            const isLocked = status?.status === 'SOLICITADO' || status?.status === 'APROBADO';

            return (
              <div key={m.fraccion} className={`rounded-xl border bg-white overflow-hidden ${
                status?.status === 'APROBADO' ? 'border-green-200' : 'border-gray-100'
              }`}>
                {/* Card header */}
                <div className={`px-5 py-4 flex items-center justify-between ${
                  status?.status === 'APROBADO' ? 'bg-green-50' : 'bg-gray-50'
                }`}>
                  <div>
                    <p className="font-bold text-gray-900 text-sm uppercase tracking-wide">{m.nombre || m.fraccion}</p>
                    <p className="text-xs text-gray-500 mt-0.5 font-mono">
                      {m.cantidadKG.toLocaleString()} KG · {m.cantidadBultos} {m.tipoBulto} · {m.fraccion}
                    </p>
                  </div>
                  <div className="text-right">
                    {!status && (
                      <span className="text-xs text-gray-400">Sin solicitar</span>
                    )}
                    {status?.status === 'PENDIENTE' && (
                      <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">Pendiente</span>
                    )}
                    {status?.status === 'SOLICITADO' && (
                      <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Loader2 size={10} className="animate-spin" /> Solicitado
                      </span>
                    )}
                    {status?.status === 'APROBADO' && (
                      <div className="text-xs text-green-700">
                        <p className="font-semibold flex items-center gap-1"><CheckCircle2 size={13} /> Aprobado</p>
                        {status.permisoFitoNumero && <p className="font-mono">{status.permisoFitoNumero}</p>}
                        {status.dictamenNumero    && <p className="font-mono">{status.dictamenNumero}</p>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Form — hidden if approved */}
                {status?.status !== 'APROBADO' && form && (
                  <div className="px-5 py-4 grid grid-cols-2 gap-4">
                    <div>
                      <FL>Licencia Sanitaria *</FL>
                      <TI value={form.licenciaSanitaria} onChange={v => setSigieField(m.fraccion, 'licenciaSanitaria', v)}
                        placeholder="LS-GT-XXXX" disabled={isLocked} />
                    </div>
                    <div>
                      <FL>Temperatura</FL>
                      <TI value={form.temperatura} onChange={v => setSigieField(m.fraccion, 'temperatura', v)}
                        placeholder="N/A" disabled={isLocked} />
                    </div>
                    <div>
                      <FL>No. Cert. Fito MX</FL>
                      <TI value={form.numCertFitoMX} onChange={v => setSigieField(m.fraccion, 'numCertFitoMX', v)}
                        placeholder="E-26-XXXXXXX" disabled={isLocked} />
                    </div>
                    <div>
                      <FL>No. Factura (CFDI)</FL>
                      <TI value={form.numFactura} onChange={v => setSigieField(m.fraccion, 'numFactura', v)}
                        disabled={isLocked} />
                    </div>
                    <div>
                      <FL>Aduana entrada GT</FL>
                      <TI value={transport.aduanaEntradaGT} readOnly />
                    </div>
                    <div>
                      <FL>Exportador</FL>
                      <TI value={preview.expNombre} readOnly />
                    </div>
                    <div>
                      <FL>Fecha embarque</FL>
                      <TI value={form.fechaEmbarque} onChange={v => setSigieField(m.fraccion, 'fechaEmbarque', v)}
                        type="date" disabled={isLocked} />
                    </div>
                    <div>
                      <FL>Fecha arribo estimada *</FL>
                      <TI value={form.fechaArriboEstimada} onChange={v => setSigieField(m.fraccion, 'fechaArriboEstimada', v)}
                        type="date" disabled={isLocked} />
                    </div>
                    <div>
                      <FL>No. Contenedor / Caja</FL>
                      <TI value={form.numContenedor} onChange={v => setSigieField(m.fraccion, 'numContenedor', v)}
                        placeholder="Placa o No. Económico" disabled={isLocked} />
                    </div>
                    <div>
                      <FL>No. Lote (opcional)</FL>
                      <TI value={form.numLote} onChange={v => setSigieField(m.fraccion, 'numLote', v)}
                        disabled={isLocked} />
                    </div>
                    <div>
                      <FL>No. Cert. Inocuidad (opcional)</FL>
                      <TI value={form.numCertInocuidad} onChange={v => setSigieField(m.fraccion, 'numCertInocuidad', v)}
                        disabled={isLocked} />
                    </div>
                    <div>
                      <FL>No. Análisis Lab (opcional)</FL>
                      <TI value={form.numAnalisisLab} onChange={v => setSigieField(m.fraccion, 'numAnalisisLab', v)}
                        disabled={isLocked} />
                    </div>

                    {/* Bultos editable */}
                    <div>
                      <FL>Cantidad de bultos</FL>
                      <input type="number" value={form.cantidadBultos}
                        onChange={e => setSigieField(m.fraccion, 'cantidadBultos', Number(e.target.value))}
                        disabled={isLocked}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-gray-50" />
                    </div>
                    <div>
                      <FL>Tipo de bulto</FL>
                      <select value={form.tipoBulto}
                        onChange={e => setSigieField(m.fraccion, 'tipoBulto', e.target.value)}
                        disabled={isLocked}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none disabled:bg-gray-50">
                        {TIPOS_BULTO.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>

                    <div className="col-span-2 pt-2">
                      <button
                        onClick={() => handleSolicitarSIGIE(m.fraccion)}
                        disabled={pending || isLocked || !form.licenciaSanitaria}
                        className="w-full py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition"
                        style={{ background: 'var(--brand-primary)' }}>
                        {pending
                          ? <><Loader2 size={14} className="animate-spin" /> Solicitando...</>
                          : isLocked
                          ? '✓ Solicitud enviada'
                          : `Solicitar SIGIE para ${m.nombre || m.fraccion}`}
                      </button>
                      {!form.licenciaSanitaria && (
                        <p className="text-xs text-red-500 mt-1 text-center">Licencia Sanitaria es obligatoria</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div className="rounded-xl border border-gray-100 bg-white px-6 py-4 flex gap-3">
            <button onClick={() => setStep(4)} className="flex items-center gap-1 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
              <ChevronLeft size={15} /> Atrás
            </button>
            <button onClick={() => setStep(6)} disabled={!allSigieApproved}
              className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              style={{ background: 'var(--brand-primary)' }}>
              {allSigieApproved ? 'Continuar →' : `Esperando aprobación SIGIE (${mercancias.filter(m => sigieStatuses[m.fraccion]?.status === 'APROBADO').length}/${mercancias.length})`}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          STEP 6 — Confirmar
      ═══════════════════════════════════════════════ */}
      {step === 6 && preview && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 space-y-5">
          <div className="text-center pb-2">
            <CheckCircle2 className="w-14 h-14 mx-auto mb-3 text-green-500" />
            <h2 className="text-xl font-semibold">Expediente listo</h2>
            <p className="text-sm mt-1 text-gray-500">Todos los requisitos completados</p>
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            {[
              { label: 'CFDI procesado',         ok: !!preview },
              { label: 'Transporte asignado',    ok: !!transport.pilotoId || !!transport.transporteEmpresaId },
              { label: 'Packing List generado',  ok: !!docs?.packingListUrl },
              { label: 'Carta Porte MX generada',ok: !!docs?.cartaPorteMXUrl },
              { label: 'Carta Porte GT generada',ok: !!docs?.cartaPorteGTUrl },
              { label: 'Fito México subido',     ok: fitoUploaded || !!fitoMXNumero },
              ...mercancias.map(m => ({
                label: `SIGIE aprobado — ${m.nombre || m.fraccion}`,
                ok: sigieStatuses[m.fraccion]?.status === 'APROBADO',
              })),
            ].map(({ label, ok }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-gray-50">
                {ok
                  ? <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                  : <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />}
                <span className={`text-sm ${ok ? 'text-gray-800' : 'text-gray-400'}`}>{label}</span>
              </div>
            ))}
          </div>

          {/* Totales */}
          <div className="rounded-lg bg-gray-50 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Exportador</span>
              <span className="font-medium">{preview.expNombre}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total USD</span>
              <span className="font-bold font-mono">${preview.totalUSD?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tributos estimados (DAI + IVA)</span>
              <span className="font-bold font-mono text-yellow-600">
                Q{((preview.tributos?.daiGTQ ?? 0) + (preview.tributos?.ivaGTQ ?? 0)).toFixed(2)}
              </span>
            </div>
          </div>

          <button onClick={() => router.push(`/import/${preview.expedienteId}`)}
            className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition"
            style={{ background: 'var(--brand-primary)' }}>
            Ver expediente completo →
          </button>
        </div>
      )}
    </div>
  );
}
