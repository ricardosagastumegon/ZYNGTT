'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Users, AlertCircle, RefreshCw } from 'lucide-react';

const ROL_ES: Record<string, string> = {
  SUPERADMIN: 'Super Admin', ADMIN: 'Administrador', EMPRESA: 'Empresa',
  AGENTE: 'Agente Aduanal', TRANSPORTISTA: 'Transportista',
};
const ROL_COLOR: Record<string, string> = {
  SUPERADMIN: 'bg-red-100 text-red-700', ADMIN: 'bg-indigo-100 text-indigo-700',
  EMPRESA: 'bg-blue-100 text-blue-700', AGENTE: 'bg-green-100 text-green-700',
  TRANSPORTISTA: 'bg-amber-100 text-amber-700',
};

interface UserRow { id: string; firstName: string; lastName: string; email: string; role: string; createdAt: string; company?: { name: string } | null; }

export default function UsuariosPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-usuarios'],
    queryFn: () => api.get('/api/users').then(r => r.data.data as UserRow[]),
  });
  const users = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>Usuarios</h1>
        <p className="text-sm text-gray-500 mt-1">{isLoading ? '—' : users.length} usuarios totales</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? <div className="p-10 text-center text-gray-400">Cargando...</div>
        : isError ? <div className="p-10 text-center"><AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" /><button onClick={() => refetch()} className="inline-flex items-center gap-1 text-navy-700 text-sm hover:underline"><RefreshCw size={13} /> Reintentar</button></div>
        : users.length === 0 ? <div className="p-10 text-center"><Users className="w-8 h-8 text-gray-200 mx-auto mb-2" /><p className="text-gray-400 text-sm">Sin usuarios</p></div>
        : <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100"><tr>{['Nombre', 'Email', 'Rol', 'Empresa', 'Registro'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{u.firstName} {u.lastName}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-1 rounded-full ${ROL_COLOR[u.role] ?? 'bg-gray-100 text-gray-600'}`}>{ROL_ES[u.role] ?? u.role}</span></td>
                <td className="px-4 py-3 text-gray-500">{u.company?.name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-400">{new Date(u.createdAt).toLocaleDateString('es-GT')}</td>
              </tr>)}
            </tbody>
          </table>}
      </div>
    </div>
  );
}
