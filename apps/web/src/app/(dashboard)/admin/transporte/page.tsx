'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Truck, User, Box, Plus, ChevronDown, ChevronRight, X, Pencil, PowerOff } from 'lucide-react';

interface TransportEmpresa {
  id: string; nombre: string; CAAT: string; activo: boolean;
  _count?: { pilotos: number; cabezales: number; cajas: number };
}
interface Piloto { id: string; nombre: string; numLicencia: string; tipoLicencia?: string; activo: boolean }
interface Cabezal { id: string; placa: string; marca?: string; modelo?: string; anio?: number; activo: boolean }
interface Caja { id: string; placa: string; numEconomico?: string; tipo: string; activo: boolean }

type ModalType =
  | { kind: 'empresa' }
  | { kind: 'piloto'; empresaId: string }
  | { kind: 'cabezal'; empresaId: string }
  | { kind: 'caja'; empresaId: string }
  | null;

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        <h3 className="font-semibold text-lg mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, type = 'text' }: {
  label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input type={type} name={name} value={value} onChange={onChange}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
    </div>
  );
}

function EmpresaRow({ empresa, onAdd }: { empresa: TransportEmpresa; onAdd: (modal: ModalType) => void }) {
  const [expanded, setExpanded] = useState(false);
  const qc = useQueryClient();

  const { data: pilotos = [] } = useQuery<Piloto[]>({
    queryKey: ['adm-pilotos', empresa.id],
    queryFn: () => api.get(`/api/transport/empresas/${empresa.id}/pilotos`).then(r => r.data.data),
    enabled: expanded,
  });
  const { data: cabezales = [] } = useQuery<Cabezal[]>({
    queryKey: ['adm-cabezales', empresa.id],
    queryFn: () => api.get(`/api/transport/empresas/${empresa.id}/cabezales`).then(r => r.data.data),
    enabled: expanded,
  });
  const { data: cajas = [] } = useQuery<Caja[]>({
    queryKey: ['adm-cajas', empresa.id],
    queryFn: () => api.get(`/api/transport/empresas/${empresa.id}/cajas`).then(r => r.data.data),
    enabled: expanded,
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => api.delete(`/api/transport/empresas/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adm-empresas'] }),
  });

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 cursor-pointer"
        onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Truck size={16} className="text-indigo-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{empresa.nombre}</p>
            <p className="text-xs text-gray-400 font-mono">CAAT: {empresa.CAAT}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-3 text-xs text-gray-500">
            <span>{empresa._count?.pilotos ?? '—'} pilotos</span>
            <span>{empresa._count?.cabezales ?? '—'} cabezales</span>
            <span>{empresa._count?.cajas ?? '—'} cajas</span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${empresa.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {empresa.activo ? 'Activa' : 'Inactiva'}
          </span>
          <button onClick={e => { e.stopPropagation(); deactivate.mutate(empresa.id); }}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
            title="Desactivar">
            <PowerOff size={14} />
          </button>
          {expanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 space-y-5">
          {/* Pilotos */}
          <SubSection
            label="Pilotos"
            icon={<User size={14} />}
            onAdd={() => onAdd({ kind: 'piloto', empresaId: empresa.id })}
          >
            {pilotos.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">Sin pilotos</p>
            ) : pilotos.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{p.nombre}</p>
                  <p className="text-xs text-gray-400 font-mono">{p.numLicencia} {p.tipoLicencia ? `· Tipo ${p.tipoLicencia}` : ''}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${p.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {p.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            ))}
          </SubSection>

          {/* Cabezales */}
          <SubSection
            label="Cabezales"
            icon={<Truck size={14} />}
            onAdd={() => onAdd({ kind: 'cabezal', empresaId: empresa.id })}
          >
            {cabezales.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">Sin cabezales</p>
            ) : cabezales.map(c => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium font-mono text-gray-800">{c.placa}</p>
                  <p className="text-xs text-gray-400">{[c.marca, c.modelo, c.anio].filter(Boolean).join(' · ')}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {c.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            ))}
          </SubSection>

          {/* Cajas */}
          <SubSection
            label="Cajas / Furgones"
            icon={<Box size={14} />}
            onAdd={() => onAdd({ kind: 'caja', empresaId: empresa.id })}
          >
            {cajas.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">Sin cajas</p>
            ) : cajas.map(c => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium font-mono text-gray-800">{c.placa}</p>
                  <p className="text-xs text-gray-400">#{c.numEconomico ?? '—'} · {c.tipo}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {c.activo ? 'Activa' : 'Inactiva'}
                </span>
              </div>
            ))}
          </SubSection>
        </div>
      )}
    </div>
  );
}

function SubSection({ label, icon, onAdd, children }: {
  label: string; icon: React.ReactNode; onAdd: () => void; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {icon} {label}
        </div>
        <button onClick={onAdd}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg text-indigo-600 hover:bg-indigo-50 transition">
          <Plus size={12} /> Agregar
        </button>
      </div>
      <div className="bg-white rounded-lg border border-gray-100 px-3 divide-y divide-gray-50">
        {children}
      </div>
    </div>
  );
}

export default function AdminTransportePage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<ModalType>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const { data: empresas = [], isLoading } = useQuery<TransportEmpresa[]>({
    queryKey: ['adm-empresas'],
    queryFn: () => api.get('/api/transport/empresas').then(r => r.data.data),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const save = useMutation({
    mutationFn: async () => {
      if (!modal) return;
      if (modal.kind === 'empresa') {
        await api.post('/api/transport/empresas', form);
      } else {
        const payload = { ...form, anio: form.anio ? parseInt(form.anio) : undefined };
        await api.post(`/api/transport/empresas/${modal.empresaId}/${modal.kind === 'piloto' ? 'pilotos' : modal.kind === 'cabezal' ? 'cabezales' : 'cajas'}`, payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adm-empresas'] });
      if (modal && modal.kind !== 'empresa') {
        const empresaId = modal.empresaId;
        qc.invalidateQueries({ queryKey: [`adm-${modal.kind}s`, empresaId] });
      }
      setModal(null);
      setForm({});
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Transporte</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión de empresas transportistas y su flota</p>
        </div>
        <button onClick={() => { setModal({ kind: 'empresa' }); setForm({}); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ background: 'var(--brand-primary)' }}>
          <Plus size={15} /> Nueva empresa
        </button>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-gray-400 text-sm">Cargando empresas...</div>
      )}

      {!isLoading && empresas.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Truck className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-sm">No hay empresas de transporte registradas.</p>
          <button onClick={() => { setModal({ kind: 'empresa' }); setForm({}); }}
            className="mt-4 text-sm text-indigo-600 hover:underline">
            Crear primera empresa
          </button>
        </div>
      )}

      <div className="space-y-3">
        {empresas.map(e => (
          <EmpresaRow key={e.id} empresa={e} onAdd={setModal} />
        ))}
      </div>

      {/* Modal empresa */}
      {modal?.kind === 'empresa' && (
        <Modal title="Nueva Empresa de Transporte" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <Field label="Nombre de la empresa" name="nombre" value={form.nombre ?? ''} onChange={handleChange} />
            <Field label="Número CAAT" name="CAAT" value={form.CAAT ?? ''} onChange={handleChange} />
            <button onClick={() => save.mutate()} disabled={save.isPending}
              className="w-full py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              style={{ background: 'var(--brand-primary)' }}>
              {save.isPending ? 'Guardando...' : 'Guardar empresa'}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal piloto */}
      {modal?.kind === 'piloto' && (
        <Modal title="Agregar Piloto" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <Field label="Nombre completo" name="nombre" value={form.nombre ?? ''} onChange={handleChange} />
            <Field label="Número de licencia" name="numLicencia" value={form.numLicencia ?? ''} onChange={handleChange} />
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de licencia</label>
              <select name="tipoLicencia" value={form.tipoLicencia ?? ''} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                <option value="">Seleccionar...</option>
                {['A', 'B', 'C', 'D', 'E'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <button onClick={() => save.mutate()} disabled={save.isPending}
              className="w-full py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              style={{ background: 'var(--brand-primary)' }}>
              {save.isPending ? 'Guardando...' : 'Guardar piloto'}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal cabezal */}
      {modal?.kind === 'cabezal' && (
        <Modal title="Agregar Cabezal" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <Field label="Placa" name="placa" value={form.placa ?? ''} onChange={handleChange} />
            <Field label="Marca" name="marca" value={form.marca ?? ''} onChange={handleChange} />
            <Field label="Modelo" name="modelo" value={form.modelo ?? ''} onChange={handleChange} />
            <Field label="Año" name="anio" value={form.anio ?? ''} onChange={handleChange} type="number" />
            <Field label="Tarjeta de circulación" name="tarjetaCirculacion" value={form.tarjetaCirculacion ?? ''} onChange={handleChange} />
            <button onClick={() => save.mutate()} disabled={save.isPending}
              className="w-full py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              style={{ background: 'var(--brand-primary)' }}>
              {save.isPending ? 'Guardando...' : 'Guardar cabezal'}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal caja */}
      {modal?.kind === 'caja' && (
        <Modal title="Agregar Caja / Furgón" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <Field label="Placa" name="placa" value={form.placa ?? ''} onChange={handleChange} />
            <Field label="Número económico" name="numEconomico" value={form.numEconomico ?? ''} onChange={handleChange} />
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
              <select name="tipo" value={form.tipo ?? 'SECA'} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                <option>SECA</option>
                <option>REFRIGERADA</option>
              </select>
            </div>
            <Field label="Tarjeta de circulación" name="tarjetaCirculacion" value={form.tarjetaCirculacion ?? ''} onChange={handleChange} />
            <button onClick={() => save.mutate()} disabled={save.isPending}
              className="w-full py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              style={{ background: 'var(--brand-primary)' }}>
              {save.isPending ? 'Guardando...' : 'Guardar caja'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
