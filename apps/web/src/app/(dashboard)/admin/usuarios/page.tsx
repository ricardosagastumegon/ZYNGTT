'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  Users, Plus, Search, RefreshCw, AlertCircle,
  Eye, Key, ToggleLeft, ToggleRight, ShieldAlert,
  X, ChevronDown,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
interface UserRow {
  id: string; firstName: string; lastName: string; email: string;
  role: string; isActive: boolean; phone?: string | null; createdAt: string;
  company?: { id: string; name: string } | null;
}

interface CreateForm {
  email: string; password: string; firstName: string; lastName: string;
  role: string; phone: string;
  companyName: string; companyNIT: string;
  nitAgente: string; agenciaNombre: string;
  transporteEmpresa: string; caat: string;
}

const EMPTY_FORM: CreateForm = {
  email: '', password: '', firstName: '', lastName: '',
  role: 'EMPRESA', phone: '',
  companyName: '', companyNIT: '',
  nitAgente: '', agenciaNombre: '',
  transporteEmpresa: '', caat: '',
};

// ── Constants ────────────────────────────────────────────────────────────────
const ROLES = ['EMPRESA', 'AGENTE', 'TRANSPORTISTA', 'ADMIN', 'SUPERADMIN'] as const;

const ROL_ES: Record<string, string> = {
  SUPERADMIN: 'Super Admin', ADMIN: 'Administrador', EMPRESA: 'Empresa',
  AGENTE: 'Agente Aduanal', TRANSPORTISTA: 'Transportista',
};
const ROL_COLOR: Record<string, string> = {
  SUPERADMIN: 'bg-red-100 text-red-700', ADMIN: 'bg-indigo-100 text-indigo-700',
  EMPRESA: 'bg-blue-100 text-blue-700', AGENTE: 'bg-green-100 text-green-700',
  TRANSPORTISTA: 'bg-amber-100 text-amber-700',
};

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminUsuariosPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch]         = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_FORM);
  const [createErr, setCreateErr]   = useState('');
  const [resetResult, setResetResult] = useState<{ userId: string; tempPassword: string } | null>(null);
  const [editRoleFor, setEditRoleFor] = useState<{ id: string; current: string } | null>(null);
  const [newRole, setNewRole]         = useState('');

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-users', roleFilter, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (roleFilter) params.set('role', roleFilter);
      if (search)     params.set('search', search);
      return api.get(`/api/users?${params}`).then(r => r.data as { data: UserRow[]; total: number });
    },
    staleTime: 30_000,
  });

  const users = data?.data ?? [];

  // ── Mutations ────────────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: (form: CreateForm) => api.post('/api/users', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setShowCreate(false); setCreateForm(EMPTY_FORM); setCreateErr(''); },
    onError:   (e: unknown) => setCreateErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error al crear usuario'),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.put(`/api/users/${id}/status`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.put(`/api/users/${id}/role`, { role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setEditRoleFor(null); },
  });

  const resetMut = useMutation({
    mutationFn: (id: string) => api.post(`/api/users/${id}/reset-password`),
    onSuccess: (res, id) => setResetResult({ userId: id, tempPassword: res.data.data.tempPassword }),
  });

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
            Administración de Usuarios
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isLoading ? '—' : `${data?.total ?? 0} usuarios registrados`}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition"
          style={{ background: 'var(--brand-primary)' }}
        >
          <Plus size={15} /> Crear usuario
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 p-1 bg-white border border-gray-100 rounded-lg">
          {[{ label: 'Todos', value: '' }, ...ROLES.map(r => ({ label: ROL_ES[r], value: r }))].map(f => (
            <button
              key={f.value}
              onClick={() => setRoleFilter(f.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-md transition"
              style={{
                background: roleFilter === f.value ? 'var(--brand-primary)' : 'transparent',
                color:      roleFilter === f.value ? '#fff' : 'var(--color-text-secondary)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-100 rounded-lg flex-1 max-w-xs">
          <Search size={14} className="text-gray-400 flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email…"
            className="text-sm outline-none w-full text-gray-700 placeholder-gray-400"
          />
        </div>
        <button onClick={() => refetch()} className="p-2 text-gray-400 hover:text-gray-600 bg-white border border-gray-100 rounded-lg">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400">Cargando usuarios…</div>
        ) : isError ? (
          <div className="p-10 text-center">
            <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <button onClick={() => refetch()} className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline">
              <RefreshCw size={13} /> Reintentar
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center">
            <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Sin usuarios</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Nombre', 'Email', 'Rol', 'Empresa / Agencia', 'Estado', 'Registro', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => (
                  <tr key={u.id} className={`hover:bg-gray-50 ${!u.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-800">{u.firstName} {u.lastName}</td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${ROL_COLOR[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                        {ROL_ES[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.company?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => statusMut.mutate({ id: u.id, isActive: !u.isActive })}
                        className="flex items-center gap-1.5 text-xs font-medium transition"
                        style={{ color: u.isActive ? '#16a34a' : '#9ca3af' }}
                        title={u.isActive ? 'Desactivar' : 'Activar'}
                      >
                        {u.isActive
                          ? <ToggleRight size={18} className="text-green-500" />
                          : <ToggleLeft  size={18} className="text-gray-400" />}
                        {u.isActive ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(u.createdAt).toLocaleDateString('es-GT')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => router.push(`/admin/usuarios/${u.id}`)}
                          title="Ver perfil"
                          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => { setEditRoleFor({ id: u.id, current: u.role }); setNewRole(u.role); }}
                          title="Cambiar rol"
                          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition"
                        >
                          <ShieldAlert size={14} />
                        </button>
                        <button
                          onClick={() => resetMut.mutate(u.id)}
                          title="Resetear contraseña"
                          disabled={resetMut.isPending}
                          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-amber-600 transition disabled:opacity-40"
                        >
                          <Key size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create User Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Crear usuario</h2>
              <button onClick={() => { setShowCreate(false); setCreateErr(''); setCreateForm(EMPTY_FORM); }} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nombre" value={createForm.firstName} onChange={v => setCreateForm(p => ({ ...p, firstName: v }))} />
                <Field label="Apellido" value={createForm.lastName} onChange={v => setCreateForm(p => ({ ...p, lastName: v }))} />
              </div>
              <Field label="Email" type="email" value={createForm.email} onChange={v => setCreateForm(p => ({ ...p, email: v }))} />
              <Field label="Contraseña temporal" type="password" value={createForm.password} onChange={v => setCreateForm(p => ({ ...p, password: v }))} />
              <Field label="Teléfono" value={createForm.phone} onChange={v => setCreateForm(p => ({ ...p, phone: v }))} />
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rol</label>
                <div className="relative">
                  <select
                    value={createForm.role}
                    onChange={e => setCreateForm(p => ({ ...p, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 appearance-none outline-none focus:border-indigo-400 bg-white"
                  >
                    {ROLES.map(r => <option key={r} value={r}>{ROL_ES[r]}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Conditional fields */}
              {createForm.role === 'EMPRESA' && (
                <div className="p-4 bg-blue-50 rounded-lg space-y-3">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Datos de la empresa</p>
                  <Field label="Nombre de la empresa" value={createForm.companyName} onChange={v => setCreateForm(p => ({ ...p, companyName: v }))} />
                  <Field label="NIT empresa" value={createForm.companyNIT} onChange={v => setCreateForm(p => ({ ...p, companyNIT: v }))} />
                </div>
              )}
              {createForm.role === 'AGENTE' && (
                <div className="p-4 bg-green-50 rounded-lg space-y-3">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Perfil del agente</p>
                  <Field label="NIT del agente" value={createForm.nitAgente} onChange={v => setCreateForm(p => ({ ...p, nitAgente: v }))} />
                  <Field label="Agencia aduanal" value={createForm.agenciaNombre} onChange={v => setCreateForm(p => ({ ...p, agenciaNombre: v }))} />
                </div>
              )}
              {createForm.role === 'TRANSPORTISTA' && (
                <div className="p-4 bg-amber-50 rounded-lg space-y-3">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Perfil del transportista</p>
                  <Field label="Empresa de transporte" value={createForm.transporteEmpresa} onChange={v => setCreateForm(p => ({ ...p, transporteEmpresa: v }))} />
                  <Field label="CAAT" value={createForm.caat} onChange={v => setCreateForm(p => ({ ...p, caat: v }))} />
                </div>
              )}

              {createErr && (
                <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{createErr}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => { setShowCreate(false); setCreateErr(''); setCreateForm(EMPTY_FORM); }}
                  className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => createMut.mutate(createForm)}
                  disabled={createMut.isPending}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition disabled:opacity-60"
                  style={{ background: 'var(--brand-primary)' }}
                >
                  {createMut.isPending ? 'Creando…' : 'Crear usuario'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Role Modal ── */}
      {editRoleFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Cambiar rol</h2>
            <div className="relative mb-4">
              <select
                value={newRole}
                onChange={e => setNewRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 appearance-none outline-none focus:border-indigo-400 bg-white"
              >
                {ROLES.map(r => <option key={r} value={r}>{ROL_ES[r]}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditRoleFor(null)} className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button
                onClick={() => roleMut.mutate({ id: editRoleFor.id, role: newRole })}
                disabled={roleMut.isPending || newRole === editRoleFor.current}
                className="flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition disabled:opacity-60"
                style={{ background: 'var(--brand-primary)' }}
              >
                {roleMut.isPending ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Password Result Modal ── */}
      {resetResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <Key className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h2 className="font-semibold text-gray-900 mb-1">Contraseña reseteada</h2>
            <p className="text-sm text-gray-500 mb-4">Entrega esta contraseña temporal al usuario:</p>
            <div className="bg-amber-50 border border-amber-100 rounded-lg px-6 py-3 mb-4">
              <p className="font-mono text-lg font-bold text-amber-800 tracking-widest">{resetResult.tempPassword}</p>
            </div>
            <p className="text-xs text-gray-400 mb-4">El usuario deberá cambiarla en el próximo inicio de sesión.</p>
            <button
              onClick={() => setResetResult(null)}
              className="w-full px-4 py-2 text-sm font-medium text-white rounded-lg"
              style={{ background: 'var(--brand-primary)' }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:border-indigo-400 transition"
      />
    </div>
  );
}
