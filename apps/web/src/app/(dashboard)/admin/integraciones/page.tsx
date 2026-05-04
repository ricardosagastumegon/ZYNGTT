'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Wifi, WifiOff, CheckCircle2, XCircle, AlertCircle,
  RefreshCw, Settings, Shield, CreditCard, Cloud,
  Package, Truck, Key, X,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────���────────────────────────
interface IntegrationStatus {
  sigie:      { ok: boolean; url: string; credentialsCount: number };
  sat:        { ok: boolean; url: string; credentialsCount: number };
  maersk:     { configured: boolean };
  dhl:        { configured: boolean };
  shipengine: { configured: boolean };
  stripe:     { ok: boolean; mode: string; configured: boolean; lastPayment: { amount: number; currency: string; paidAt: string } | null };
  cloudinary: { configured: boolean; ok: boolean; storageMB: number | null; storageLimitMB: number | null; documentCount: number };
}

interface TestResult { ok: boolean; message: string }

// ── Credential Modal ───────────���──────────────────────────────────────────────
function CredentialModal({
  title, endpoint, onClose,
}: { title: string; endpoint: string; onClose: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult]     = useState('');
  const [saving, setSaving]     = useState(false);
  const [testing, setTesting]   = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.post(endpoint, { username, password });
      setResult('✅ Credenciales guardadas y cifradas correctamente');
    } catch {
      setResult('❌ Error al guardar credenciales');
    } finally { setSaving(false); }
  }

  async function testConn() {
    setTesting(true);
    try {
      const testEndpoint = endpoint.includes('sigie') ? '/api/admin/integrations/sigie/test' : '/api/admin/integrations/sat/test';
      const res = await api.post(testEndpoint);
      const data = res.data.data as TestResult;
      setResult(data.ok ? `✅ ${data.message}` : `❌ ${data.message}`);
    } catch {
      setResult('❌ Error al probar la conexión');
    } finally { setTesting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <p className="text-xs text-gray-500 mb-4">Las credenciales se cifran con AES-256 antes de guardar.</p>
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Usuario / NIT</label>
            <input value={username} onChange={e => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400" />
          </div>
        </div>
        {result && (
          <div className={`text-sm px-3 py-2 rounded-lg mb-3 ${result.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {result}
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={testConn} disabled={testing}
            className="flex-1 px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-60">
            {testing ? 'Probando…' : 'Probar conexión'}
          </button>
          <button onClick={save} disabled={saving || !username || !password}
            className="flex-1 px-3 py-2 text-xs font-medium text-white rounded-lg disabled:opacity-60"
            style={{ background: 'var(--brand-primary)' }}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── StatusDot ─────────────────────────────────────────────────────────────────
function StatusDot({ ok }: { ok: boolean | undefined }) {
  if (ok === undefined) return <span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block" />;
  return ok
    ? <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block animate-pulse" />
    : <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />;
}

// ── IntegrationCard ───────────────��───────────────────────────────────────────
function IntegrationCard({
  icon: Icon, title, subtitle, status, configured, children, onTest,
}: {
  icon: React.ElementType; title: string; subtitle: string;
  status?: boolean; configured?: boolean; children?: React.ReactNode;
  onTest?: () => void;
}) {
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting]       = useState(false);

  async function handleTest() {
    if (!onTest) return;
    setTesting(true);
    try { onTest(); } finally { setTesting(false); }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--neutral-100)' }}>
            <Icon size={18} className="text-gray-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
              <StatusDot ok={status} />
            </div>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {configured === false && (
            <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full font-medium">Sin API Key</span>
          )}
          {configured === true && status === true && (
            <span className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full font-medium">Conectado</span>
          )}
        </div>
      </div>
      {children}
      {testResult && (
        <div className={`text-xs px-3 py-2 rounded-lg mt-3 ${testResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {testResult.ok ? '✅' : '❌'} {testResult.message}
        </div>
      )}
    </div>
  );
}

// ── Page ───────────���────────────────────────────────────────���─────────────────
export default function IntegracionesPage() {
  const [pingResults, setPingResults]   = useState<Record<string, TestResult>>({});
  const [pinging, setPinging]           = useState<Record<string, boolean>>({});
  const [credModal, setCredModal]       = useState<{ title: string; endpoint: string } | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['integrations-status'],
    queryFn: () => api.get('/api/admin/integrations/status').then(r => r.data.data as IntegrationStatus),
    staleTime: 60_000,
  });

  async function ping(key: string, endpoint: string) {
    setPinging(p => ({ ...p, [key]: true }));
    try {
      const res = await api.post(endpoint);
      setPingResults(p => ({ ...p, [key]: res.data.data as TestResult }));
    } catch {
      setPingResults(p => ({ ...p, [key]: { ok: false, message: 'Error al conectar' } }));
    } finally {
      setPinging(p => ({ ...p, [key]: false }));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
            Panel de Integraciones
          </h1>
          <p className="text-sm text-gray-500 mt-1">Estado de todos los servicios externos conectados a ZYN</p>
        </div>
        <button onClick={() => refetch()} className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
          <RefreshCw size={14} /> Actualizar estado
        </button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 h-32 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-1/2 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="p-10 text-center">
          <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 mb-2">Error al cargar estado de integraciones</p>
          <button onClick={() => refetch()} className="text-sm text-indigo-600 hover:underline">Reintentar</button>
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* SIGIE MAGA */}
          <IntegrationCard
            icon={Shield} title="SIGIE MAGA"
            subtitle="sigie.maga.gob.gt"
            status={pingResults.sigie?.ok ?? data.sigie.ok}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Credenciales configuradas</span>
                <span className="font-medium text-gray-700">{data.sigie.credentialsCount} empresa(s)</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => ping('sigie', '/api/admin/integrations/sigie/test')}
                  disabled={pinging.sigie}
                  className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                >
                  {pinging.sigie ? 'Verificando…' : 'Verificar conexión'}
                </button>
              </div>
              {pingResults.sigie && (
                <p className={`text-xs px-2 py-1 rounded ${pingResults.sigie.ok ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                  {pingResults.sigie.ok ? '✅' : '❌'} {pingResults.sigie.message}
                </p>
              )}
            </div>
          </IntegrationCard>

          {/* SAT Guatemala */}
          <IntegrationCard
            icon={Shield} title="SAT Agencia Virtual"
            subtitle="farm3.sat.gob.gt"
            status={pingResults.sat?.ok ?? data.sat.ok}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Agentes con credenciales</span>
                <span className="font-medium text-gray-700">{data.sat.credentialsCount} agente(s)</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => ping('sat', '/api/admin/integrations/sat/test')}
                  disabled={pinging.sat}
                  className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                >
                  {pinging.sat ? 'Verificando…' : 'Verificar conexión'}
                </button>
              </div>
              {pingResults.sat && (
                <p className={`text-xs px-2 py-1 rounded ${pingResults.sat.ok ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                  {pingResults.sat.ok ? '✅' : '❌'} {pingResults.sat.message}
                </p>
              )}
            </div>
          </IntegrationCard>

          {/* Maersk */}
          <IntegrationCard
            icon={Package} title="Maersk API"
            subtitle="api.maersk.com"
            configured={data.maersk.configured}
            status={pingResults.maersk?.ok}
          >
            <div className="space-y-2">
              <p className="text-xs text-gray-500">
                API Key: {data.maersk.configured ? '●●●●●●●●' : <span className="text-amber-600">No configurada</span>}
              </p>
              <button
                onClick={() => ping('maersk', '/api/admin/integrations/maersk/test')}
                disabled={pinging.maersk || !data.maersk.configured}
                className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                {pinging.maersk ? 'Probando…' : 'Probar API'}
              </button>
              {pingResults.maersk && (
                <p className={`text-xs px-2 py-1 rounded ${pingResults.maersk.ok ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                  {pingResults.maersk.ok ? '✅' : '❌'} {pingResults.maersk.message}
                </p>
              )}
            </div>
          </IntegrationCard>

          {/* DHL */}
          <IntegrationCard
            icon={Truck} title="DHL Express API"
            subtitle="express.api.dhl.com"
            configured={data.dhl.configured}
            status={pingResults.dhl?.ok}
          >
            <div className="space-y-2">
              <p className="text-xs text-gray-500">
                API Key: {data.dhl.configured ? '●●●●●●●��' : <span className="text-amber-600">No configurada</span>}
              </p>
              <button
                onClick={() => ping('dhl', '/api/admin/integrations/dhl/test')}
                disabled={pinging.dhl || !data.dhl.configured}
                className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                {pinging.dhl ? 'Probando…' : 'Probar API'}
              </button>
              {pingResults.dhl && (
                <p className={`text-xs px-2 py-1 rounded ${pingResults.dhl.ok ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                  {pingResults.dhl.ok ? '✅' : '❌'} {pingResults.dhl.message}
                </p>
              )}
            </div>
          </IntegrationCard>

          {/* ShipEngine */}
          <IntegrationCard
            icon={Wifi} title="ShipEngine (Tracking)"
            subtitle="api.shipengine.com"
            configured={data.shipengine.configured}
          >
            <p className="text-xs text-gray-500">
              API Key: {data.shipengine.configured ? '●●●●●��●●' : <span className="text-amber-600">No configurada</span>}
            </p>
          </IntegrationCard>

          {/* Stripe */}
          <IntegrationCard
            icon={CreditCard} title="Stripe (Pagos)"
            subtitle="api.stripe.com"
            configured={data.stripe.configured}
            status={data.stripe.ok}
          >
            <div className="space-y-1.5 text-xs text-gray-500">
              {data.stripe.configured && (
                <div className="flex items-center justify-between">
                  <span>Modo</span>
                  <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${data.stripe.mode === 'Producción' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {data.stripe.mode}
                  </span>
                </div>
              )}
              {data.stripe.lastPayment && (
                <div className="flex items-center justify-between">
                  <span>Último pago</span>
                  <span className="font-medium text-gray-700">
                    ${data.stripe.lastPayment.amount.toLocaleString()} {data.stripe.lastPayment.currency.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </IntegrationCard>

          {/* Supabase Storage */}
          <IntegrationCard
            icon={Cloud} title="Supabase Storage (Documentos)"
            subtitle="supabase.co/storage"
            configured={data.cloudinary.configured}
            status={data.cloudinary.ok}
          >
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Documentos subidos</span>
              <span className="font-medium text-gray-700">{data.cloudinary.documentCount}</span>
            </div>
          </IntegrationCard>

        </div>
      )}

      {credModal && (
        <CredentialModal
          title={credModal.title}
          endpoint={credModal.endpoint}
          onClose={() => setCredModal(null)}
        />
      )}
    </div>
  );
}
