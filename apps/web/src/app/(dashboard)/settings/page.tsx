'use client';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function SettingsPage() {
  const { user } = useAuth();
  const setUser = useAuthStore(s => s.setUser);

  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phone: user?.phone ?? '',
    companyName: user?.company?.name ?? '',
    companyTaxId: user?.company?.taxId ?? '',
    companyAddress: user?.company?.address ?? '',
    companyPhone: user?.company?.phone ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  function set(key: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await api.put('/api/users/me', form);
      setUser(res.data.data);
      setSaved(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Mi Cuenta</h1>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Datos personales */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Datos Personales</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nombre</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.firstName}
                onChange={e => set('firstName', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Apellido</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.lastName}
                onChange={e => set('lastName', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                value={user?.email ?? ''}
                readOnly
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Teléfono</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="+502 0000 0000"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Rol</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                value={user?.role ?? ''}
                readOnly
              />
            </div>
          </div>
        </section>

        {/* Datos de empresa — usados en documentos aduaneros */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Datos de Empresa</h2>
          <p className="text-xs text-gray-400 mb-4">Estos datos aparecen como Importador en los documentos aduaneros (Carta de Porte, Packing List, Manifiesto).</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Razón Social</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.companyName}
                onChange={e => set('companyName', e.target.value)}
                placeholder="Nombre de tu empresa en Guatemala"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">NIT Guatemala</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.companyTaxId}
                onChange={e => set('companyTaxId', e.target.value)}
                placeholder="12345678-9"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Teléfono Empresa</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.companyPhone}
                onChange={e => set('companyPhone', e.target.value)}
                placeholder="+502 2000 0000"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Dirección Fiscal</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.companyAddress}
                onChange={e => set('companyAddress', e.target.value)}
                placeholder="Zona 10, Guatemala City, Guatemala"
              />
            </div>
          </div>
        </section>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>
        )}
        {saved && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">Cambios guardados correctamente.</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </form>
    </div>
  );
}
