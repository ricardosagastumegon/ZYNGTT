'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Building2, AlertCircle, RefreshCw, Eye } from 'lucide-react';

interface EmpresaRow {
  id: string; firstName: string; lastName: string; email: string;
  isActive: boolean; createdAt: string;
  company?: { id: string; name: string; taxId?: string | null } | null;
}

export default function AdminEmpresasPage() {
  const router = useRouter();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-empresas'],
    queryFn: () => api.get('/api/users?role=EMPRESA').then(r => r.data.data as EmpresaRow[]),
    staleTime: 30_000,
  });

  const empresas = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
          Empresas
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isLoading ? '—' : `${empresas.length} empresas registradas`}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400">Cargando…</div>
        ) : isError ? (
          <div className="p-10 text-center">
            <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <button onClick={() => refetch()} className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline">
              <RefreshCw size={13} /> Reintentar
            </button>
          </div>
        ) : empresas.length === 0 ? (
          <div className="p-10 text-center">
            <Building2 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Sin empresas registradas</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Empresa', 'NIT', 'Contacto', 'Email', 'Estado', 'Registro', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {empresas.map(u => (
                <tr key={u.id} className={`hover:bg-gray-50 ${!u.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-800">{u.company?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{u.company?.taxId ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{u.firstName} {u.lastName}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {u.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(u.createdAt).toLocaleDateString('es-GT')}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => router.push(`/admin/usuarios/${u.id}`)}
                      className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
                      title="Ver perfil"
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
