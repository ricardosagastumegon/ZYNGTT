'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  ArrowLeft, Building2, ClipboardList, Key, RefreshCw,
  AlertCircle, ShieldCheck, Lock, Unlock,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface UserDetail {
  id: string; firstName: string; lastName: string; email: string;
  role: string; isActive: boolean; phone?: string | null;
  metadata?: Record<string, string> | null; createdAt: string;
  company?: { id: string; name: string; taxId?: string | null } | null;
  expedientes: {
    id: string; status: string; totalUSD: number; createdAt: string;
    shipment: { reference: string; status: string };
  }[];
  credentials: { system: string; createdAt: string; updatedAt: string }[];
}

interface ActivityLog {
  id: string; action: string; description: string;
  ip?: string | null; createdAt: string;
  metadata?: Record<string, unknown> | null;
}

const ROL_ES: Record<string, string> = {
  SUPERADMIN: 'Super Admin', ADMIN: 'Administrador', EMPRESA: 'Empresa',
  AGENTE: 'Agente Aduanal', TRANSPORTISTA: 'Transportista',
};
const ROL_COLOR: Record<string, string> = {
  SUPERADMIN: 'bg-red-100 text-red-700', ADMIN: 'bg-indigo-100 text-indigo-700',
  EMPRESA: 'bg-blue-100 text-blue-700', AGENTE: 'bg-green-100 text-green-700',
  TRANSPORTISTA: 'bg-amber-100 text-amber-700',
};
const EXP_STATUS_ES: Record<string, string> = {
  CFDI_PENDIENTE: 'CFDI Pendiente', DOCS_GENERADOS: 'Docs Generados',
  SIGIE_SOLICITADO: 'SIGIE Solicitado', SIGIE_APROBADO: 'MAGA Aprobado',
  DUCA_LISTA: 'Lista para DUCA', DUCA_TRANSMITIDA: 'DUCA Transmitida',
  SEMAFORO_VERDE: 'Sem. Verde', SEMAFORO_ROJO: 'Sem. Rojo',
  LIBERADA: 'Liberada', RECHAZADA: 'Rechazada',
};

// ── SATCredentialModal ────────────────────────────────────────────────────────
function SATCredentialModal({ agentId, onClose }: { agentId: string; onClose: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult]     = useState('');
  const [saving, setSaving]     = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.post(`/api/admin/credentials/sat/${agentId}`, { username, password });
      setResult('✅ Credenciales SAT guardadas correctamente');
    } catch {
      setResult('❌ Error al guardar credenciales');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-1">Credenciales SAT Guatemala</h3>
        <p className="text-xs text-gray-500 mb-4">Las credenciales se cifran con AES-256 antes de guardar.</p>
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">NIT SAT / Usuario</label>
            <input value={username} onChange={e => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Contraseña SAT</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400" />
          </div>
        </div>
        {result && <p className="text-sm mb-3">{result}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cerrar</button>
          <button onClick={save} disabled={saving || !username || !password}
            className="flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-60"
            style={{ background: 'var(--brand-primary)' }}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function UserDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [showSATCreds, setShowSATCreds] = useState(false);
  const [resetResult, setResetResult]  = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['user-detail', params.id],
    queryFn: () => api.get(`/api/users/${params.id}`).then(r => r.data.data as UserDetail),
  });

  const { data: logsData } = useQuery({
    queryKey: ['user-history', params.id],
    queryFn: () => api.get(`/api/users/${params.id}/history`).then(r => r.data.data as ActivityLog[]),
  });

  const statusMut = useMutation({
    mutationFn: (isActive: boolean) => api.put(`/api/users/${params.id}/status`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-detail', params.id] }),
  });

  const resetMut = useMutation({
    mutationFn: () => api.post(`/api/users/${params.id}/reset-password`),
    onSuccess: res => setResetResult(`Contraseña temporal: ${res.data.data.tempPassword}`),
  });

  if (isLoading) return <div className="p-10 text-center text-gray-400">Cargando…</div>;
  if (isError || !data) return (
    <div className="p-10 text-center">
      <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
      <p className="text-sm text-gray-500">No se pudo cargar el usuario</p>
    </div>
  );

  const u = data;
  const logs = logsData ?? [];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition">
        <ArrowLeft size={14} /> Volver a usuarios
      </button>

      {/* User header */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
            style={{ background: 'var(--brand-primary)' }}>
            {u.firstName[0]}{u.lastName[0]}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{u.firstName} {u.lastName}</h1>
            <p className="text-sm text-gray-500">{u.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${ROL_COLOR[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                {ROL_ES[u.role] ?? u.role}
              </span>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {u.isActive ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => statusMut.mutate(!u.isActive)}
            disabled={statusMut.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
          >
            {u.isActive ? <Lock size={12} /> : <Unlock size={12} />}
            {u.isActive ? 'Desactivar' : 'Activar'}
          </button>
          <button
            onClick={() => resetMut.mutate()}
            disabled={resetMut.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-amber-200 rounded-lg text-amber-700 hover:bg-amber-50 transition"
          >
            <Key size={12} /> Resetear contraseña
          </button>
        </div>
      </div>

      {resetResult && (
        <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 flex items-center justify-between">
          <p className="text-sm font-medium text-amber-800">{resetResult}</p>
          <button onClick={() => setResetResult('')} className="text-amber-500 hover:text-amber-700 ml-4">✕</button>
        </div>
      )}

      {/* Role-specific sections */}
      {u.role === 'EMPRESA' && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <Building2 size={16} className="text-blue-500" /> Datos de la empresa
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Field label="Nombre empresa" value={u.company?.name ?? '—'} />
            <Field label="NIT / Tax ID" value={u.company?.taxId ?? '—'} />
            <Field label="Teléfono" value={u.phone ?? '—'} />
            <Field label="Registro" value={new Date(u.createdAt).toLocaleDateString('es-GT')} />
          </div>
        </div>
      )}

      {u.role === 'AGENTE' && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <ShieldCheck size={16} className="text-green-500" /> Perfil del agente aduanal
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <Field label="NIT del agente" value={(u.metadata as Record<string, string> | null)?.nitAgente ?? '—'} />
            <Field label="Agencia" value={(u.metadata as Record<string, string> | null)?.agenciaNombre ?? u.company?.name ?? '—'} />
            <Field label="Empresa asociada" value={u.company?.name ?? '—'} />
            <Field label="Teléfono" value={u.phone ?? '—'} />
          </div>
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Credenciales SAT</p>
              <button
                onClick={() => setShowSATCreds(true)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg text-white transition"
                style={{ background: 'var(--brand-primary)' }}
              >
                {u.credentials.some(c => c.system === 'SAT') ? 'Actualizar credenciales SAT' : 'Configurar credenciales SAT'}
              </button>
            </div>
            {u.credentials.some(c => c.system === 'SAT') ? (
              <p className="text-xs text-green-600">✅ Credenciales SAT configuradas — última actualización: {new Date(u.credentials.find(c => c.system === 'SAT')!.updatedAt).toLocaleDateString('es-GT')}</p>
            ) : (
              <p className="text-xs text-amber-600">⚠️ No hay credenciales SAT configuradas para este agente</p>
            )}
          </div>
        </div>
      )}

      {u.role === 'TRANSPORTISTA' && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <Building2 size={16} className="text-amber-500" /> Perfil del transportista
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Field label="Empresa de transporte" value={(u.metadata as Record<string, string> | null)?.transporteEmpresa ?? u.company?.name ?? '—'} />
            <Field label="CAAT" value={(u.metadata as Record<string, string> | null)?.caat ?? '—'} />
            <Field label="Teléfono" value={u.phone ?? '—'} />
            <Field label="Registro" value={new Date(u.createdAt).toLocaleDateString('es-GT')} />
          </div>
        </div>
      )}

      {/* Expedientes history */}
      {(u.role === 'EMPRESA' || u.role === 'AGENTE') && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <ClipboardList size={15} className="text-gray-400" />
            <h2 className="font-semibold text-gray-800">Historial de expedientes</h2>
            <span className="ml-auto text-xs text-gray-400">{u.expedientes.length} registros</span>
          </div>
          {u.expedientes.length === 0 ? (
            <p className="p-6 text-sm text-gray-400 text-center">Sin expedientes registrados</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Referencia', 'Estado', 'Valor USD', 'Fecha'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {u.expedientes.map(exp => (
                  <tr key={exp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700">{exp.shipment.reference}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{EXP_STATUS_ES[exp.status] ?? exp.status}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-700">${exp.totalUSD.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(exp.createdAt).toLocaleDateString('es-GT')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Activity log */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <RefreshCw size={15} className="text-gray-400" />
          <h2 className="font-semibold text-gray-800">Registro de actividad</h2>
          <span className="ml-auto text-xs text-gray-400">{logs.length} eventos</span>
        </div>
        {logs.length === 0 ? (
          <p className="p-6 text-sm text-gray-400 text-center">Sin actividad registrada</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Acción', 'Descripción', 'IP', 'Fecha'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-gray-600">{log.action}</td>
                  <td className="px-4 py-3 text-gray-600">{log.description}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{log.ip ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(log.createdAt).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showSATCreds && <SATCredentialModal agentId={params.id} onClose={() => setShowSATCreds(false)} />}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-700">{value}</p>
    </div>
  );
}
