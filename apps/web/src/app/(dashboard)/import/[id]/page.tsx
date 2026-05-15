'use client';

import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';
import {
  FileText, Truck, Package, Shield, CheckCircle2, XCircle, Clock, Lock,
  Pencil, RefreshCw, Save, X, Loader2, AlertCircle,
} from 'lucide-react';

const STATUS_STEPS = [
  { key: 'CFDI_PENDIENTE',   label: 'CFDI Cargado',    icon: FileText },
  { key: 'DOCS_GENERADOS',   label: 'Docs Generados',  icon: FileText },
  { key: 'SIGIE_SOLICITADO', label: 'SIGIE Solicitado', icon: Clock },
  { key: 'SIGIE_APROBADO',   label: 'MAGA Aprobado',   icon: Shield },
  { key: 'DUCA_LISTA',       label: 'DUCA Lista',      icon: Package },
  { key: 'DUCA_TRANSMITIDA', label: 'DUCA Transmitida', icon: CheckCircle2 },
  { key: 'SEMAFORO_VERDE',   label: 'Semáforo Verde',  icon: CheckCircle2 },
  { key: 'LIBERADA',         label: 'Liberada',        icon: CheckCircle2 },
];
const STATUS_ORDER = STATUS_STEPS.map(s => s.key);

const TIPOS_BULTO = ['A GRANEL', 'CAJAS', 'CARTÓN', 'SACOS', 'ARPILLA', 'PALLET', 'BULTO'];
const ADUANAS_GT = ['ADUANA TECUN UMAN II', 'ADUANA TECUN UMAN I', 'ADUANA EL CARMEN'];
const ADUANAS_MX = ['ADUANA SUCHIATE II', 'ADUANA CIUDAD HIDALGO'];

interface SIGIEPermiso {
  id: string;
  producto: string;
  status: string;
  permisoFitoNumero?: string;
  dictamenNumero?: string;
  permisoFitoUrl?: string;
}

interface Mercancia {
  fraccion: string;
  nombre?: string;
  cantidadKG: number;
  cantidadBultos?: number;
  tipoBulto?: string;
  valorUSD?: number;
}

interface Expediente {
  id: string;
  status: string;
  sigieStatus: string;
  expNombre: string;
  expRFC: string;
  impNombre: string;
  impNIT?: string;
  totalUSD: number;
  pesoTotalKG: number;
  incoterm: string;
  mercancias: Mercancia[];

  // Flat transport fields (from backend mapping)
  pilotoNombre?: string;
  pilotoLicencia?: string;
  cabezalPlaca?: string;
  cabezalTarjeta?: string;
  cabezalMarca?: string;
  furgonPlaca?: string;
  furgonTarjeta?: string;
  furgonNumEconomico?: string;
  transporteEmpresa?: string;
  transporteCAAT?: string;

  // FK IDs for editing
  transporteEmpresaId?: string;
  pilotoId?: string;
  cabezalId?: string;
  cajaId?: string;
  fleteCosto?: number;

  cartaPorteMXUrl?: string;
  cartaPorteGTUrl?: string;
  packingListUrl?: string;
  fitoMXUrl?: string;
  labUrl?: string;
  cifUSD?: number;
  daiTotal?: number;
  ivaTotal?: number;
  totalTributos?: number;
  sigiePermisos?: SIGIEPermiso[];
  ducaDNumero?: string;
  satSemaforo?: string;
  shipment?: { reference: string; status: string };
  fechaCruce?: string;
  aduanaSalidaMX?: string;
  aduanaEntradaGT?: string;
}

interface ChecklistItem {
  item: string;
  ok: boolean;
  stage: 1 | 2 | 3;
  detail?: string;
}

interface ChecklistResult {
  items: ChecklistItem[];
  stage1Complete: boolean;
  stage2Complete: boolean;
  readyForDuca: boolean;
}

interface TransportEmpresa { id: string; nombre: string; CAAT: string }
interface Piloto { id: string; nombre: string; numLicencia: string }
interface Cabezal { id: string; placa: string; marca?: string }
interface Caja { id: string; placa: string; numEconomico?: string; tipo: string }

// ─── Helpers ────────────────────────────────────────────────────────────────
function FL({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1">{children}</label>;
}
function TI({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type} value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
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

// ─── Component ──────────────────────────────────────────────────────────────
export default function ExpedienteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState(0);
  const [transmitting, setTransmitting] = useState(false);

  const [editingTransport, setEditingTransport] = useState(false);
  const [editingMercancias, setEditingMercancias] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [docsStale, setDocsStale] = useState(false);
  const [err, setErr] = useState('');

  const [tForm, setTForm] = useState({
    transporteEmpresaId: '', pilotoId: '', cabezalId: '', cajaId: '',
    aduanaEntradaGT: '', aduanaSalidaMX: '',
    fechaCruce: '', fleteCosto: '',
  });
  const [mForm, setMForm] = useState<Mercancia[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['expediente', id],
    queryFn: () => api.get(`/api/import/${id}`).then(r => r.data.data as Expediente),
  });

  const { data: checklistData, refetch: refetchChecklist } = useQuery({
    queryKey: ['checklist', id],
    queryFn: () => api.get(`/api/automation/checklist/${id}`).then(r => r.data.data as ChecklistResult),
    enabled: !!id,
  });

  // Transport catalogs — only when editing transport
  const { data: empresas = [] } = useQuery<TransportEmpresa[]>({
    queryKey: ['transport-empresas'],
    queryFn: () => api.get('/api/transport/empresas').then(r => r.data.data),
    enabled: editingTransport,
  });
  const { data: pilotos = [] } = useQuery<Piloto[]>({
    queryKey: ['t-pilotos', tForm.transporteEmpresaId],
    queryFn: () => api.get(`/api/transport/empresas/${tForm.transporteEmpresaId}/pilotos`).then(r => r.data.data),
    enabled: editingTransport && !!tForm.transporteEmpresaId,
  });
  const { data: cabezales = [] } = useQuery<Cabezal[]>({
    queryKey: ['t-cabezales', tForm.transporteEmpresaId],
    queryFn: () => api.get(`/api/transport/empresas/${tForm.transporteEmpresaId}/cabezales`).then(r => r.data.data),
    enabled: editingTransport && !!tForm.transporteEmpresaId,
  });
  const { data: cajas = [] } = useQuery<Caja[]>({
    queryKey: ['t-cajas', tForm.transporteEmpresaId],
    queryFn: () => api.get(`/api/transport/empresas/${tForm.transporteEmpresaId}/cajas`).then(r => r.data.data),
    enabled: editingTransport && !!tForm.transporteEmpresaId,
  });

  function openTransportEdit() {
    if (!data) return;
    setTForm({
      transporteEmpresaId: data.transporteEmpresaId || '',
      pilotoId: data.pilotoId || '',
      cabezalId: data.cabezalId || '',
      cajaId: data.cajaId || '',
      aduanaEntradaGT: data.aduanaEntradaGT || 'ADUANA TECUN UMAN II',
      aduanaSalidaMX: data.aduanaSalidaMX || 'ADUANA SUCHIATE II',
      fechaCruce: data.fechaCruce ? new Date(data.fechaCruce).toISOString().slice(0, 10) : '',
      fleteCosto: data.fleteCosto?.toString() || '350',
    });
    setEditingTransport(true);
    setErr('');
  }

  async function saveTransport() {
    setSaving(true); setErr('');
    try {
      await api.post(`/api/import/transport/${id}`, {
        transporteEmpresaId: tForm.transporteEmpresaId || undefined,
        pilotoId: tForm.pilotoId || undefined,
        cabezalId: tForm.cabezalId || undefined,
        cajaId: tForm.cajaId || undefined,
        aduanaEntradaGT: tForm.aduanaEntradaGT || undefined,
        aduanaSalidaMX: tForm.aduanaSalidaMX || undefined,
        fechaCruce: tForm.fechaCruce || undefined,
        fleteCosto: parseFloat(tForm.fleteCosto) || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['expediente', id] });
      setEditingTransport(false);
      if (data?.cartaPorteMXUrl || data?.cartaPorteGTUrl || data?.packingListUrl) setDocsStale(true);
    } catch (e: unknown) {
      const ex = e as { response?: { data?: { error?: string } } };
      setErr(ex.response?.data?.error ?? 'Error al guardar transporte');
    } finally { setSaving(false); }
  }

  function openMercanciasEdit() {
    if (!data) return;
    setMForm(data.mercancias.map(m => ({
      fraccion: m.fraccion,
      nombre: m.nombre,
      cantidadKG: m.cantidadKG,
      cantidadBultos: m.cantidadBultos ?? 1,
      tipoBulto: m.tipoBulto ?? 'CAJAS',
      valorUSD: m.valorUSD,
    })));
    setEditingMercancias(true);
    setErr('');
  }

  async function saveMercancias() {
    setSaving(true); setErr('');
    try {
      await api.patch(`/api/import/mercancias/${id}`, { mercancias: mForm });
      await queryClient.invalidateQueries({ queryKey: ['expediente', id] });
      setEditingMercancias(false);
      if (data?.cartaPorteMXUrl || data?.cartaPorteGTUrl || data?.packingListUrl) setDocsStale(true);
    } catch (e: unknown) {
      const ex = e as { response?: { data?: { error?: string } } };
      setErr(ex.response?.data?.error ?? 'Error al guardar mercancías');
    } finally { setSaving(false); }
  }

  async function regenerateDocs() {
    setRegenerating(true); setErr('');
    try {
      await api.post(`/api/import/generate-docs/${id}`);
      await queryClient.invalidateQueries({ queryKey: ['expediente', id] });
      setDocsStale(false);
    } catch (e: unknown) {
      const ex = e as { response?: { data?: { error?: string } } };
      setErr(ex.response?.data?.error ?? 'Error al regenerar documentos');
    } finally { setRegenerating(false); }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--brand-primary)' }} />
    </div>
  );
  if (!data) return <div className="text-center py-12 text-gray-400">Expediente no encontrado</div>;

  const currentIdx = STATUS_ORDER.indexOf(data.status);
  const isRejected = data.status === 'RECHAZADA' || data.status === 'SEMAFORO_ROJO';
  const sigieEnviado = (data.sigiePermisos ?? []).some(p =>
    p.status === 'SOLICITADO' || p.status === 'APROBADO'
  );
  const hasDocs = !!(data.cartaPorteMXUrl || data.cartaPorteGTUrl || data.packingListUrl);

  const checklist = checklistData;
  const stage1Items = checklist?.items.filter(i => i.stage === 1) ?? [];
  const stage2Items = checklist?.items.filter(i => i.stage === 2) ?? [];

  async function handleTransmitDuca() {
    setTransmitting(true);
    try {
      await api.post(`/api/automation/sat/${id}`);
      refetchChecklist();
    } catch (e: unknown) {
      const ex = e as { response?: { data?: { error?: string } } };
      alert(ex.response?.data?.error ?? 'Error al transmitir DUCA-D');
    } finally {
      setTransmitting(false);
    }
  }

  const tabs = ['General', 'Documentos', 'Transporte', 'Mercancías', 'MAGA/SIGIE', 'SAT', 'Tributos'];
  const tipoEmpresa = empresas.find(e => e.id === tForm.transporteEmpresaId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            Expediente #{data.id.slice(-8).toUpperCase()}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Envío {data.shipment?.reference} · {data.expNombre} → {data.impNombre}
          </p>
        </div>
        <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${
          data.status === 'LIBERADA' ? 'bg-green-100 text-green-800' :
          isRejected ? 'bg-red-100 text-red-700' :
          data.status.includes('SIGIE') ? 'bg-amber-100 text-amber-800' :
          'bg-blue-50 text-blue-700'
        }`}>
          {data.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Banner: docs stale */}
      {docsStale && hasDocs && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <AlertCircle size={16} />
            <span><strong>Datos modificados.</strong> Los documentos generados están desactualizados.</span>
          </div>
          <button onClick={regenerateDocs} disabled={regenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 disabled:opacity-50">
            {regenerating
              ? <><Loader2 size={12} className="animate-spin" /> Regenerando...</>
              : <><RefreshCw size={12} /> Regenerar Documentos</>}
          </button>
        </div>
      )}

      {/* Banner: SIGIE already submitted but data edited */}
      {sigieEnviado && docsStale && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 border border-orange-200 text-sm text-orange-800">
          <AlertCircle size={16} />
          <span>⚠️ Solicitud SIGIE ya enviada. Si cambiaron piloto/cabezal/caja, deberás solicitar un nuevo permiso.</span>
        </div>
      )}

      {/* Error banner */}
      {err && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle size={16} /> {err}
        </div>
      )}

      {/* Timeline */}
      <div className="rounded-xl border bg-white p-5" style={{ borderColor: 'var(--color-border)' }}>
        <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--color-text-secondary)' }}>Progreso</h3>
        <div className="flex items-center overflow-x-auto">
          {STATUS_STEPS.map(({ key, label, icon: Icon }, i) => {
            const done = i <= currentIdx;
            const active = i === currentIdx;
            return (
              <div key={key} className="flex items-center">
                <div className="flex flex-col items-center gap-1 min-w-[72px]">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    active && isRejected ? 'bg-red-500' :
                    active ? 'bg-indigo-600' :
                    done ? 'bg-green-500' : 'bg-gray-200'
                  }`}>
                    {active && isRejected ? <XCircle size={15} className="text-white" /> :
                     done ? <CheckCircle2 size={15} className="text-white" /> :
                     <Icon size={15} className="text-gray-400" />}
                  </div>
                  <span className="text-xs text-center leading-tight"
                    style={{ color: active ? 'var(--brand-primary)' : '#9CA3AF', fontWeight: active ? 600 : 400 }}>
                    {label}
                  </span>
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div className="h-px flex-1 mx-1 min-w-[16px]"
                    style={{ background: i < currentIdx ? 'var(--success, #22c55e)' : '#E5E7EB' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div>
        <div className="flex border-b mb-4 overflow-x-auto" style={{ borderColor: 'var(--color-border)' }}>
          {tabs.map((t, i) => (
            <button key={t} onClick={() => setActiveTab(i)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === i ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}>
              {t}
            </button>
          ))}
        </div>

        <div className="rounded-xl border bg-white p-5" style={{ borderColor: 'var(--color-border)' }}>

          {/* Tab 0 — General + Checklist */}
          {activeTab === 0 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['Exportador (MX)', data.expNombre],
                  ['RFC Exportador', data.expRFC],
                  ['Importador (GT)', data.impNombre],
                  ['NIT Importador', data.impNIT ?? '—'],
                  ['Incoterm', data.incoterm],
                  ['Total USD', `$${data.totalUSD?.toLocaleString()}`],
                  ['Peso Total', `${data.pesoTotalKG?.toLocaleString()} KG`],
                  ['Aduana Salida', data.aduanaSalidaMX ?? '—'],
                  ['Aduana Entrada', data.aduanaEntradaGT ?? '—'],
                  ['Fecha de Cruce', data.fechaCruce ? new Date(data.fechaCruce).toLocaleDateString('es-GT') : '—'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>{label}</p>
                    <p className="text-sm font-medium mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              {checklist && (
                <div className="space-y-4 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <h3 className="text-sm font-semibold text-gray-700">Checklist de requisitos</h3>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Etapa 1 — Documentos base</span>
                      {checklist.stage1Complete && <CheckCircle2 size={14} className="text-green-500" />}
                    </div>
                    <div className="space-y-1">
                      {stage1Items.map(item => (
                        <div key={item.item} className="flex items-center gap-2 text-sm">
                          {item.ok
                            ? <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />
                            : <XCircle size={15} className="text-red-400 flex-shrink-0" />}
                          <span style={{ color: item.ok ? '#111' : '#EF4444' }}>{item.item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Etapa 2 — Permisos MAGA/SIGIE</span>
                      {checklist.stage2Complete && <CheckCircle2 size={14} className="text-green-500" />}
                    </div>
                    {stage2Items.length === 0 ? (
                      <p className="text-xs text-gray-400">Sin productos registrados en SIGIE aún</p>
                    ) : (
                      <div className="space-y-1">
                        {stage2Items.map(item => (
                          <div key={item.item} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              {item.ok
                                ? <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />
                                : <Clock size={15} className="text-amber-400 flex-shrink-0" />}
                              <span>{item.item}</span>
                            </div>
                            {item.detail && (
                              <span className="text-xs font-mono text-gray-400">{item.detail}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Etapa 3 — DUCA-D SAT</span>
                    </div>
                    {checklist.readyForDuca ? (
                      <button onClick={handleTransmitDuca} disabled={transmitting}
                        className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 transition"
                        style={{ background: 'var(--brand-primary)' }}>
                        {transmitting ? 'Transmitiendo...' : '📡 Transmitir DUCA-D'}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Lock size={15} />
                        <span>Bloqueada hasta completar Etapas 1 y 2</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 1 — Documentos */}
          {activeTab === 1 && (
            <div className="space-y-3">
              {hasDocs && (
                <div className="flex justify-end mb-2">
                  <button onClick={regenerateDocs} disabled={regenerating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-xs font-medium disabled:opacity-50">
                    {regenerating
                      ? <><Loader2 size={12} className="animate-spin" /> Regenerando...</>
                      : <><RefreshCw size={12} /> Regenerar Documentos</>}
                  </button>
                </div>
              )}
              {[
                { label: 'Carta Porte MX',       url: data.cartaPorteMXUrl },
                { label: 'Carta Porte GT',       url: data.cartaPorteGTUrl },
                { label: 'Packing List',         url: data.packingListUrl },
                { label: 'Fitosanitario MX',     url: data.fitoMXUrl },
                { label: 'Resultado Laboratorio', url: data.labUrl },
              ].map(({ label, url }) => (
                <div key={label} className="flex items-center justify-between p-3 rounded-lg border"
                  style={{ borderColor: 'var(--color-border)', background: url ? 'var(--neutral-50)' : '#fff' }}>
                  <div className="flex items-center gap-2">
                    <FileText size={16} className={url ? 'text-green-600' : 'text-gray-300'} />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  {url
                    ? <a href={url} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-medium px-3 py-1 rounded-full text-white"
                        style={{ background: 'var(--brand-primary)' }}>Ver / Descargar</a>
                    : <span className="text-xs text-gray-400">Pendiente</span>}
                </div>
              ))}
              {!hasDocs && (
                <div className="pt-2">
                  <button onClick={regenerateDocs} disabled={regenerating || !data.pilotoId || !data.cabezalId || !data.cajaId}
                    className="w-full py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: 'var(--brand-primary)' }}>
                    {regenerating
                      ? <><Loader2 size={14} className="animate-spin" /> Generando...</>
                      : <><FileText size={14} /> Generar Documentos</>}
                  </button>
                  {(!data.pilotoId || !data.cabezalId || !data.cajaId) && (
                    <p className="text-xs text-gray-400 mt-1 text-center">Completa Transporte primero (piloto, cabezal, caja)</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab 2 — Transporte */}
          {activeTab === 2 && (
            <div>
              <div className="flex justify-end mb-3">
                {!editingTransport ? (
                  <button onClick={openTransportEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-medium text-gray-700">
                    <Pencil size={12} /> Editar
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => setEditingTransport(false)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-medium text-gray-700">
                      <X size={12} /> Cancelar
                    </button>
                    <button onClick={saveTransport} disabled={saving}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-medium disabled:opacity-50"
                      style={{ background: 'var(--brand-primary)' }}>
                      {saving ? <><Loader2 size={12} className="animate-spin" /> Guardando</> : <><Save size={12} /> Guardar</>}
                    </button>
                  </div>
                )}
              </div>

              {!editingTransport ? (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ['Empresa', data.transporteEmpresa],
                    ['CAAT', data.transporteCAAT],
                    ['Piloto', data.pilotoNombre],
                    ['Licencia', data.pilotoLicencia],
                    ['Cabezal Placa', data.cabezalPlaca],
                    ['Cabezal Tarjeta', data.cabezalTarjeta],
                    ['Furgón Placa', data.furgonPlaca],
                    ['Furgón Tarjeta', data.furgonTarjeta],
                    ['Aduana Salida MX', data.aduanaSalidaMX],
                    ['Aduana Entrada GT', data.aduanaEntradaGT],
                    ['Fecha Cruce', data.fechaCruce ? new Date(data.fechaCruce).toLocaleDateString('es-GT') : null],
                    ['Costo Flete USD', data.fleteCosto ? `$${data.fleteCosto.toLocaleString()}` : null],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <p className="text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>{l}</p>
                      <p className="text-sm font-medium mt-0.5 font-mono">{v ?? '—'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <FL>Empresa Transportista</FL>
                    <SI value={tForm.transporteEmpresaId}
                      onChange={v => setTForm(p => ({ ...p, transporteEmpresaId: v, pilotoId: '', cabezalId: '', cajaId: '' }))}>
                      <option value="">Seleccionar empresa...</option>
                      {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                    </SI>
                    {tipoEmpresa && (
                      <p className="text-xs text-indigo-600 mt-1 font-mono">CAAT: {tipoEmpresa.CAAT}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FL>Piloto</FL>
                      <SI value={tForm.pilotoId} onChange={v => setTForm(p => ({ ...p, pilotoId: v }))} disabled={!tForm.transporteEmpresaId}>
                        <option value="">Seleccionar...</option>
                        {pilotos.map(p => <option key={p.id} value={p.id}>{p.nombre} — {p.numLicencia}</option>)}
                      </SI>
                    </div>
                    <div>
                      <FL>Cabezal</FL>
                      <SI value={tForm.cabezalId} onChange={v => setTForm(p => ({ ...p, cabezalId: v }))} disabled={!tForm.transporteEmpresaId}>
                        <option value="">Seleccionar...</option>
                        {cabezales.map(c => <option key={c.id} value={c.id}>{c.placa}{c.marca ? ` — ${c.marca}` : ''}</option>)}
                      </SI>
                    </div>
                    <div>
                      <FL>Caja / Furgón</FL>
                      <SI value={tForm.cajaId} onChange={v => setTForm(p => ({ ...p, cajaId: v }))} disabled={!tForm.transporteEmpresaId}>
                        <option value="">Seleccionar...</option>
                        {cajas.map(c => <option key={c.id} value={c.id}>{c.placa}{c.numEconomico ? ` — #${c.numEconomico}` : ''} ({c.tipo})</option>)}
                      </SI>
                    </div>
                    <div>
                      <FL>Fecha de Cruce</FL>
                      <TI value={tForm.fechaCruce} onChange={v => setTForm(p => ({ ...p, fechaCruce: v }))} type="date" />
                    </div>
                    <div>
                      <FL>Aduana Salida (MX)</FL>
                      <SI value={tForm.aduanaSalidaMX} onChange={v => setTForm(p => ({ ...p, aduanaSalidaMX: v }))}>
                        {ADUANAS_MX.map(a => <option key={a}>{a}</option>)}
                      </SI>
                    </div>
                    <div>
                      <FL>Aduana Entrada (GT)</FL>
                      <SI value={tForm.aduanaEntradaGT} onChange={v => setTForm(p => ({ ...p, aduanaEntradaGT: v }))}>
                        {ADUANAS_GT.map(a => <option key={a}>{a}</option>)}
                      </SI>
                    </div>
                    <div>
                      <FL>Costo del Flete (USD)</FL>
                      <TI value={tForm.fleteCosto} onChange={v => setTForm(p => ({ ...p, fleteCosto: v }))} type="number" placeholder="350" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 3 — Mercancías */}
          {activeTab === 3 && (
            <div>
              <div className="flex justify-end mb-3">
                {!editingMercancias ? (
                  <button onClick={openMercanciasEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-medium text-gray-700">
                    <Pencil size={12} /> Editar Bultos / Tipo
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => setEditingMercancias(false)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-medium text-gray-700">
                      <X size={12} /> Cancelar
                    </button>
                    <button onClick={saveMercancias} disabled={saving}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-medium disabled:opacity-50"
                      style={{ background: 'var(--brand-primary)' }}>
                      {saving ? <><Loader2 size={12} className="animate-spin" /> Guardando</> : <><Save size={12} /> Guardar</>}
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {(editingMercancias ? mForm : data.mercancias).map((m, idx) => {
                  const bultos = m.cantidadBultos ?? 1;
                  const tipo = m.tipoBulto ?? 'CAJAS';
                  const pesoPorBulto = bultos > 0 ? m.cantidadKG / bultos : 0;
                  return (
                    <div key={`${m.fraccion}-${idx}`} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 flex items-start justify-between border-b border-gray-100">
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{m.nombre || m.fraccion}</p>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">{m.fraccion}</p>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          <p className="font-medium">{m.cantidadKG.toLocaleString()} kg total</p>
                          {m.valorUSD != null && (
                            <p className="text-gray-400">${m.valorUSD.toLocaleString()} USD</p>
                          )}
                        </div>
                      </div>
                      <div className="px-4 py-4 grid grid-cols-3 gap-4">
                        <div>
                          <FL>Cantidad Bultos</FL>
                          {editingMercancias ? (
                            <input type="number" min={1} value={bultos}
                              onChange={e => setMForm(prev => prev.map((x, i) => i === idx ? { ...x, cantidadBultos: Math.max(1, Number(e.target.value)) } : x))}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                          ) : (
                            <p className="text-sm font-medium font-mono">{bultos}</p>
                          )}
                        </div>
                        <div>
                          <FL>Peso por Bulto</FL>
                          <p className="text-sm font-medium font-mono text-gray-600">{pesoPorBulto.toFixed(2)} kg</p>
                          <p className="text-xs text-gray-400">calculado</p>
                        </div>
                        <div>
                          <FL>Tipo Presentación</FL>
                          {editingMercancias ? (
                            <select value={tipo}
                              onChange={e => setMForm(prev => prev.map((x, i) => i === idx ? { ...x, tipoBulto: e.target.value } : x))}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                              {TIPOS_BULTO.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          ) : (
                            <p className="text-sm font-medium">{tipo}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 4 — MAGA/SIGIE */}
          {activeTab === 4 && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-tertiary)' }}>Estado SIGIE</p>
                <p className="text-sm font-semibold">{data.sigieStatus}</p>
              </div>
              {(data.sigiePermisos ?? []).length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-tertiary)' }}>Permisos por producto</p>
                  <div className="space-y-2">
                    {(data.sigiePermisos ?? []).map(p => (
                      <div key={p.id} className="p-3 rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{p.producto}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            p.status === 'APROBADO' ? 'bg-green-100 text-green-700' :
                            p.status === 'SOLICITADO' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>{p.status}</span>
                        </div>
                        {p.permisoFitoNumero && (
                          <p className="text-xs font-mono text-gray-500">PFI: {p.permisoFitoNumero}</p>
                        )}
                        {p.dictamenNumero && (
                          <p className="text-xs font-mono text-gray-500">DIA: {p.dictamenNumero}</p>
                        )}
                        {p.permisoFitoUrl && (
                          <a href={p.permisoFitoUrl} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-indigo-600 hover:underline mt-1 block">Ver permiso</a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 5 — SAT */}
          {activeTab === 5 && (
            <div className="space-y-3">
              {[
                ['No. DUCA-D', data.ducaDNumero],
                ['Semáforo', data.satSemaforo],
              ].map(([l, v]) => (
                <div key={l} className="p-3 rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-tertiary)' }}>{l}</p>
                  <p className="text-sm font-mono font-semibold">{v ?? '—'}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tab 6 — Tributos */}
          {activeTab === 6 && (
            <div className="space-y-2">
              {[
                ['Valor CIF (USD)', `$${data.cifUSD?.toFixed(2) ?? '—'}`],
                ['DAI (GTQ)',       `Q${data.daiTotal?.toFixed(2) ?? '—'}`],
                ['IVA (GTQ)',       `Q${data.ivaTotal?.toFixed(2) ?? '—'}`],
                ['Total Tributos',  `Q${data.totalTributos?.toFixed(2) ?? '—'}`],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between items-center p-3 rounded-lg border"
                  style={{ borderColor: 'var(--color-border)' }}>
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{l}</span>
                  <span className="font-bold font-mono">{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
