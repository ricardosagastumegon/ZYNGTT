'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';
import { FileText, Truck, Package, Shield, CheckCircle2, XCircle, Clock, Lock } from 'lucide-react';

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

interface SIGIEPermiso {
  id: string;
  producto: string;
  status: string;
  permisoFitoNumero?: string;
  dictamenNumero?: string;
  permisoFitoUrl?: string;
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
  mercancias: { fraccion: string; nombre?: string; cantidadKG: number }[];
  pilotoNombre?: string;
  pilotoLicencia?: string;
  cabezalPlaca?: string;
  cabezalTarjeta?: string;
  furgonPlaca?: string;
  furgonTarjeta?: string;
  transporteEmpresa?: string;
  transporteCAAT?: string;
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

export default function ExpedienteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState(0);
  const [transmitting, setTransmitting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['expediente', id],
    queryFn: () => api.get(`/api/import/${id}`).then(r => r.data.data as Expediente),
  });

  const { data: checklistData, refetch: refetchChecklist } = useQuery({
    queryKey: ['checklist', id],
    queryFn: () => api.get(`/api/automation/checklist/${id}`).then(r => r.data.data as ChecklistResult),
    enabled: !!id,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--brand-primary)' }} />
    </div>
  );
  if (!data) return <div className="text-center py-12 text-gray-400">Expediente no encontrado</div>;

  const currentIdx = STATUS_ORDER.indexOf(data.status);
  const isRejected = data.status === 'RECHAZADA' || data.status === 'SEMAFORO_ROJO';

  const checklist = checklistData;
  const stage1Items = checklist?.items.filter(i => i.stage === 1) ?? [];
  const stage2Items = checklist?.items.filter(i => i.stage === 2) ?? [];

  async function handleTransmitDuca() {
    setTransmitting(true);
    try {
      await api.post(`/api/automation/sat/${id}`);
      refetchChecklist();
    } catch (e: any) {
      alert(e?.response?.data?.error ?? 'Error al transmitir DUCA-D');
    } finally {
      setTransmitting(false);
    }
  }

  const tabs = ['General', 'Documentos', 'Transporte', 'MAGA/SIGIE', 'SAT', 'Tributos'];

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
        <div className="flex border-b mb-4" style={{ borderColor: 'var(--color-border)' }}>
          {tabs.map((t, i) => (
            <button key={t} onClick={() => setActiveTab(i)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
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

              {/* Checklist */}
              {checklist && (
                <div className="space-y-4 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <h3 className="text-sm font-semibold text-gray-700">Checklist de requisitos</h3>

                  {/* Etapa 1 */}
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
                          <span style={{ color: item.ok ? 'var(--color-text-primary, #111)' : '#EF4444' }}>{item.item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Etapa 2 */}
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

                  {/* Etapa 3 — DUCA */}
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
            </div>
          )}

          {/* Tab 2 — Transporte */}
          {activeTab === 2 && (
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
              ].map(([l, v]) => (
                <div key={l}>
                  <p className="text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>{l}</p>
                  <p className="text-sm font-medium mt-0.5 font-mono">{v ?? '—'}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3 — MAGA/SIGIE */}
          {activeTab === 3 && (
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

          {/* Tab 4 — SAT */}
          {activeTab === 4 && (
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

          {/* Tab 5 — Tributos */}
          {activeTab === 5 && (
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
