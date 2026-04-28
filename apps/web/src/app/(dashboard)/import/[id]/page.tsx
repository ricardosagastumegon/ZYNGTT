'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { FileText, Truck, Package, Shield, DollarSign, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

const STATUS_STEPS = [
  { key: 'CFDI_PENDIENTE', label: 'CFDI Cargado', icon: FileText },
  { key: 'DOCS_GENERADOS', label: 'Docs Generados', icon: FileText },
  { key: 'SIGIE_SOLICITADO', label: 'SIGIE Solicitado', icon: Clock },
  { key: 'SIGIE_APROBADO', label: 'MAGA Aprobado', icon: Shield },
  { key: 'DUCA_LISTA', label: 'DUCA Lista', icon: Package },
  { key: 'DUCA_TRANSMITIDA', label: 'DUCA Transmitida', icon: CheckCircle2 },
  { key: 'SEMAFORO_VERDE', label: 'Semáforo Verde', icon: CheckCircle2 },
  { key: 'LIBERADA', label: 'Liberada', icon: CheckCircle2 },
];

const STATUS_ORDER = STATUS_STEPS.map(s => s.key);

function statusIndex(status: string) {
  return STATUS_ORDER.indexOf(status);
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
  cabezalPlaca?: string;
  furgonPlaca?: string;
  transporteEmpresa?: string;
  cartaPorteMXUrl?: string;
  cartaPorteGTUrl?: string;
  packingListUrl?: string;
  fitoMXUrl?: string;
  labUrl?: string;
  cifUSD?: number;
  daiTotal?: number;
  ivaTotal?: number;
  totalTributos?: number;
  sigieNumSolicitud?: string;
  ducaDNumero?: string;
  satSemaforo?: string;
  shipment?: { reference: string; status: string };
  fechaCruce?: string;
  aduanaSalidaMX?: string;
  aduanaEntradaGT?: string;
}

export default function ExpedienteDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['expediente', id],
    queryFn: () => api.get(`/api/import/${id}`).then(r => r.data.data as Expediente),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--brand-primary)' }} />
    </div>
  );
  if (!data) return <div className="text-center py-12 text-gray-400">Expediente no encontrado</div>;

  const currentIdx = statusIndex(data.status);

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'documentos', label: 'Documentos' },
    { id: 'transporte', label: 'Transporte' },
    { id: 'maga', label: 'MAGA/SIGIE' },
    { id: 'sat', label: 'SAT' },
    { id: 'tributos', label: 'Tributos' },
  ];

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
          data.status === 'RECHAZADA' ? 'bg-red-100 text-red-700' :
          data.status.includes('SIGIE') ? 'bg-amber-100 text-amber-800' :
          'bg-blue-50 text-blue-700'
        }`}>
          {data.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Timeline */}
      <div className="rounded-xl border bg-white p-5" style={{ borderColor: 'var(--color-border)' }}>
        <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--color-text-secondary)' }}>Progreso del expediente</h3>
        <div className="flex items-center gap-0 overflow-x-auto">
          {STATUS_STEPS.map(({ key, label, icon: Icon }, i) => {
            const done = i <= currentIdx;
            const active = i === currentIdx;
            const isRejected = data.status === 'RECHAZADA' || data.status === 'SEMAFORO_ROJO';
            return (
              <div key={key} className="flex items-center min-w-0">
                <div className="flex flex-col items-center gap-1 min-w-[72px]">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    active && isRejected ? 'bg-red-500' :
                    active ? 'bg-indigo-600' :
                    done ? 'bg-green-500' :
                    'bg-gray-200'
                  }`}>
                    {active && isRejected ? <XCircle size={15} className="text-white" /> :
                     done ? <CheckCircle2 size={15} className="text-white" /> :
                     <Icon size={15} className="text-gray-400" />}
                  </div>
                  <span className={`text-xs text-center leading-tight ${active ? 'font-semibold' : 'text-gray-400'}`}
                    style={{ color: active ? 'var(--brand-primary)' : undefined }}>
                    {label}
                  </span>
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div className="h-px flex-1 mx-1 min-w-[20px]" style={{ background: i < currentIdx ? 'var(--success)' : '#E5E7EB' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content tabs */}
      <SimpleTabs tabs={tabs}>
        {/* General */}
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
              <p className="text-sm font-medium mt-0.5" style={{ fontFamily: label.includes('RFC') || label.includes('NIT') || label.includes('USD') || label.includes('KG') ? 'var(--font-mono)' : undefined }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Documentos */}
        <div className="space-y-3">
          {[
            { label: 'Carta Porte MX', url: data.cartaPorteMXUrl },
            { label: 'Carta Porte GT', url: data.cartaPorteGTUrl },
            { label: 'Packing List', url: data.packingListUrl },
            { label: 'Fitosanitario MX', url: data.fitoMXUrl },
            { label: 'Resultado Laboratorio', url: data.labUrl },
          ].map(({ label, url }) => (
            <div key={label} className="flex items-center justify-between p-3 rounded-lg border"
              style={{ borderColor: 'var(--color-border)', background: url ? 'var(--neutral-50)' : '#fff' }}>
              <div className="flex items-center gap-2">
                <FileText size={16} className={url ? 'text-green-600' : 'text-gray-300'} />
                <span className="text-sm font-medium">{label}</span>
              </div>
              {url ? (
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-medium px-3 py-1 rounded-full"
                  style={{ background: 'var(--brand-primary)', color: '#fff' }}>
                  Ver / Descargar
                </a>
              ) : (
                <span className="text-xs text-gray-400">Pendiente</span>
              )}
            </div>
          ))}
        </div>

        {/* Transporte */}
        <div className="grid grid-cols-2 gap-4">
          {[
            ['Empresa', data.transporteEmpresa],
            ['Piloto', data.pilotoNombre],
            ['Cabezal', data.cabezalPlaca],
            ['Furgón', data.furgonPlaca],
          ].map(([l, v]) => (
            <div key={l}>
              <p className="text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>{l}</p>
              <p className="text-sm font-medium mt-0.5" style={{ fontFamily: 'var(--font-mono)' }}>{v ?? '—'}</p>
            </div>
          ))}
        </div>

        {/* MAGA/SIGIE */}
        <div className="space-y-3">
          <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-tertiary)' }}>Estado SIGIE</p>
            <p className="text-sm font-semibold">{data.sigieStatus}</p>
          </div>
          {data.sigieNumSolicitud && (
            <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-tertiary)' }}>No. Solicitud SIGIE</p>
              <p className="text-sm font-mono font-semibold">{data.sigieNumSolicitud}</p>
            </div>
          )}
        </div>

        {/* SAT */}
        <div className="space-y-3">
          {[
            ['No. DUCA-D', data.ducaDNumero],
            ['No. Orden SAT', data.ducaDNumero],
            ['Semáforo', data.satSemaforo],
          ].map(([l, v]) => (
            <div key={l} className="p-3 rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-tertiary)' }}>{l}</p>
              <p className="text-sm font-mono font-semibold">{v ?? '—'}</p>
            </div>
          ))}
        </div>

        {/* Tributos */}
        <div className="space-y-2">
          {[
            ['Valor CIF (USD)', `$${data.cifUSD?.toFixed(2) ?? '—'}`],
            ['DAI (GTQ)', `Q${data.daiTotal?.toFixed(2) ?? '—'}`],
            ['IVA (GTQ)', `Q${data.ivaTotal?.toFixed(2) ?? '—'}`],
            ['Total Tributos (GTQ)', `Q${data.totalTributos?.toFixed(2) ?? '—'}`],
          ].map(([l, v]) => (
            <div key={l} className="flex justify-between items-center p-3 rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{l}</span>
              <span className="font-bold" style={{ fontFamily: 'var(--font-mono)' }}>{v}</span>
            </div>
          ))}
        </div>
      </SimpleTabs>
    </div>
  );
}

function SimpleTabs({ tabs, children }: { tabs: { id: string; label: string }[]; children: React.ReactNode[] }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="flex border-b mb-4" style={{ borderColor: 'var(--color-border)' }}>
        {tabs.map((t, i) => (
          <button key={t.id} onClick={() => setActive(i)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              active === i ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="rounded-xl border bg-white p-5" style={{ borderColor: 'var(--color-border)' }}>
        {Array.isArray(children) ? children[active] : children}
      </div>
    </div>
  );
}

function useState<T>(initial: T): [T, (v: T) => void] {
  return (require('react') as typeof import('react')).useState(initial);
}
