'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Truck, User, Package, Box, Plus, CheckCircle2, Clock, X } from 'lucide-react';

interface TransportEmpresa {
  id: string;
  nombre: string;
  CAAT: string;
  _count?: { pilotos: number; cabezales: number; cajas: number };
}
interface Piloto { id: string; nombre: string; numLicencia: string; tipoLicencia?: string }
interface Cabezal { id: string; placa: string; marca?: string; modelo?: string; anio?: number }
interface Caja { id: string; placa: string; numEconomico?: string; tipo: string }

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} aria-label="Cerrar modal" className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} aria-hidden="true" /></button>
        <h3 className="font-semibold text-lg mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

interface InputProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
}
function Input({ label, name, value, onChange, type = 'text' }: InputProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input id={name} type={type} name={name} value={value} onChange={onChange}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
    </div>
  );
}

const TABS = [
  { id: 'pilotos',      label: 'Pilotos',   icon: User },
  { id: 'cabezales',    label: 'Cabezales', icon: Truck },
  { id: 'cajas',        label: 'Cajas',     icon: Box },
  { id: 'expedientes',  label: 'Envíos',    icon: CheckCircle2 },
];

export default function TransporteDashboard() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [showModal, setShowModal] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>('');

  const { data: empresas } = useQuery<TransportEmpresa[]>({
    queryKey: ['transport-empresas'],
    queryFn: () => api.get('/api/transport/empresas').then(r => r.data.data),
  });

  const empresa = empresas?.find(e => e.id === selectedEmpresaId) ?? empresas?.[0];

  const { data: pilotos = [] } = useQuery<Piloto[]>({
    queryKey: ['pilotos', empresa?.id],
    queryFn: () => api.get(`/api/transport/empresas/${empresa!.id}/pilotos`).then(r => r.data.data),
    enabled: !!empresa,
  });

  const { data: cabezales = [] } = useQuery<Cabezal[]>({
    queryKey: ['cabezales', empresa?.id],
    queryFn: () => api.get(`/api/transport/empresas/${empresa!.id}/cabezales`).then(r => r.data.data),
    enabled: !!empresa,
  });

  const { data: cajas = [] } = useQuery<Caja[]>({
    queryKey: ['cajas', empresa?.id],
    queryFn: () => api.get(`/api/transport/empresas/${empresa!.id}/cajas`).then(r => r.data.data),
    enabled: !!empresa,
  });

  const { data: expedientes = [] } = useQuery<{ id: string; cfdiFolio: string; status: string; expNombre: string }[]>({
    queryKey: ['t-expedientes', empresa?.id],
    queryFn: () => api.get('/api/import?limit=50').then(r => r.data.data),
    enabled: !!empresa && activeTab === 3,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const add = useMutation({
    mutationFn: async () => {
      const tab = TABS[activeTab].id;
      const payload = { ...form, anio: form.anio ? parseInt(form.anio) : undefined };
      await api.post(`/api/transport/empresas/${empresa!.id}/${tab}`, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pilotos', empresa?.id] });
      qc.invalidateQueries({ queryKey: ['cabezales', empresa?.id] });
      qc.invalidateQueries({ queryKey: ['cajas', empresa?.id] });
      setShowModal(null);
      setForm({});
    },
  });

  if (!empresa) return (
    <div className="text-center py-20 text-gray-400">
      <Truck className="w-10 h-10 mx-auto mb-3 text-gray-200" />
      <p>No hay empresa de transporte asignada a tu cuenta.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Panel Transportista</h1>
          <p className="text-sm text-gray-500 mt-1">{empresa.nombre} · CAAT: {empresa.CAAT}</p>
          {empresas && empresas.length > 1 && (
            <select value={selectedEmpresaId} onChange={e => setSelectedEmpresaId(e.target.value)}
              className="mt-2 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
              {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          )}
        </div>
        <button onClick={() => { setShowModal(TABS[activeTab].id); setForm({}); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ background: 'var(--brand-primary)' }}>
          <Plus size={15} /> Agregar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pilotos',   value: pilotos.length,   icon: User,  color: 'text-blue-600',  bg: 'bg-blue-50' },
          { label: 'Cabezales', value: cabezales.length, icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Cajas',     value: cajas.length,     icon: Box,   color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
            <div className={`rounded-xl p-3 ${bg}`}><Icon className={`w-5 h-5 ${color}`} /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-mono)' }}>{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {TABS.map(({ id, label, icon: Icon }, i) => (
            <button key={id} onClick={() => setActiveTab(i)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === i ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* Pilotos */}
        {activeTab === 0 && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>
              {['Nombre', 'No. Licencia', 'Tipo', 'Estado'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {pilotos.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-sm">Sin pilotos registrados</td></tr>
              ) : pilotos.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{p.nombre}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.numLicencia}</td>
                  <td className="px-4 py-3 text-gray-500">{p.tipoLicencia ?? '—'}</td>
                  <td className="px-4 py-3"><span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Activo</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Cabezales */}
        {activeTab === 1 && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>
              {['Placa', 'Marca', 'Modelo', 'Año'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {cabezales.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-sm">Sin cabezales registrados</td></tr>
              ) : cabezales.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-semibold text-gray-800">{c.placa}</td>
                  <td className="px-4 py-3 text-gray-600">{c.marca ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.modelo ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{c.anio ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Cajas */}
        {activeTab === 2 && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>
              {['Placa', 'No. Económico', 'Tipo', 'Estado'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {cajas.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-sm">Sin cajas registradas</td></tr>
              ) : cajas.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-semibold text-gray-800">{c.placa}</td>
                  <td className="px-4 py-3 font-mono text-gray-600">{c.numEconomico ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.tipo === 'REFRIGERADA' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{c.tipo}</span>
                  </td>
                  <td className="px-4 py-3"><span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Activa</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Envíos */}
        {activeTab === 3 && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>
              {['Referencia / Folio', 'Exportador', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {expedientes.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-sm">Sin envíos asignados</td></tr>
              ) : expedientes.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{exp.cfdiFolio || exp.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-gray-700">{exp.expNombre}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{exp.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <a href={`/import/${exp.id}`} className="text-xs text-indigo-600 hover:underline">Ver</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Piloto */}
      {showModal === 'pilotos' && (
        <Modal title="Agregar Piloto" onClose={() => setShowModal(null)}>
          <div className="space-y-3">
            <Input label="Nombre completo" name="nombre" value={form.nombre ?? ''} onChange={handleChange} />
            <Input label="Número de licencia" name="numLicencia" value={form.numLicencia ?? ''} onChange={handleChange} />
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de licencia</label>
              <select name="tipoLicencia" value={form.tipoLicencia ?? ''} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                <option value="">Seleccionar...</option>
                {['A', 'B', 'C', 'D', 'E'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <button onClick={() => add.mutate()} disabled={add.isPending}
              className="w-full py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              style={{ background: 'var(--brand-primary)' }}>
              {add.isPending ? 'Guardando...' : 'Guardar piloto'}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Cabezal */}
      {showModal === 'cabezales' && (
        <Modal title="Agregar Cabezal" onClose={() => setShowModal(null)}>
          <div className="space-y-3">
            <Input label="Placa" name="placa" value={form.placa ?? ''} onChange={handleChange} />
            <Input label="Marca" name="marca" value={form.marca ?? ''} onChange={handleChange} />
            <Input label="Modelo" name="modelo" value={form.modelo ?? ''} onChange={handleChange} />
            <Input label="Año" name="anio" value={form.anio ?? ''} onChange={handleChange} type="number" />
            <Input label="Tarjeta de circulación" name="tarjetaCirculacion" value={form.tarjetaCirculacion ?? ''} onChange={handleChange} />
            <button onClick={() => add.mutate()} disabled={add.isPending}
              className="w-full py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              style={{ background: 'var(--brand-primary)' }}>
              {add.isPending ? 'Guardando...' : 'Guardar cabezal'}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Caja */}
      {showModal === 'cajas' && (
        <Modal title="Agregar Caja" onClose={() => setShowModal(null)}>
          <div className="space-y-3">
            <Input label="Placa" name="placa" value={form.placa ?? ''} onChange={handleChange} />
            <Input label="Número económico" name="numEconomico" value={form.numEconomico ?? ''} onChange={handleChange} />
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
              <select name="tipo" value={form.tipo ?? 'SECA'} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                <option>SECA</option>
                <option>REFRIGERADA</option>
              </select>
            </div>
            <Input label="Tarjeta de circulación" name="tarjetaCirculacion" value={form.tarjetaCirculacion ?? ''} onChange={handleChange} />
            <button onClick={() => add.mutate()} disabled={add.isPending}
              className="w-full py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              style={{ background: 'var(--brand-primary)' }}>
              {add.isPending ? 'Guardando...' : 'Guardar caja'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
