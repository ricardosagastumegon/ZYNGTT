'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Building2, AlertCircle, RefreshCw } from 'lucide-react';

interface EmpresaUser {
  id: string; firstName: string; lastName: string; email: string;
  company?: { name: string } | null; createdAt: string;
}

export default function EmpresasPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-empresas'],
    queryFn: () => api.get('/api/users?role=EMPRESA').then(r => r.data.data as EmpresaUser[]),
  });
  const users = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>Empresas</h1>
        <p className="text-sm text-gray-500 mt-1">{isLoading ? '—' : users.length} empresas registradas</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400">Cargando...</div>
        ) : isError ? (
          <div className="p-10 text-center">
            <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <button onClick={() => refetch()} className="inline-flex items-center gap-1 text-navy-700 text-sm hover:underline"><RefreshCw size={13} /> Reintentar</button>
          </div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center"><Building2 className="w-8 h-8 text-gray-200 mx-auto mb-2" /><p className="text-gray-400 text-sm">Sin empresas registradas</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{['Empresa', 'Contacto', 'Email', 'Registro'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{u.company?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{u.firstName} {u.lastName}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3 text-gray-400">{new Date(u.createdAt).toLocaleDateString('es-GT')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
