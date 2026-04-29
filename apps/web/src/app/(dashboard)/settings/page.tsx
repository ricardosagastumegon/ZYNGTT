'use client';
import { useAuth } from '@/hooks/useAuth';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Configuración</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Cuenta</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400 mb-1">Nombre</p>
            <p className="font-medium text-gray-800">{user?.firstName} {user?.lastName}</p>
          </div>
          <div>
            <p className="text-gray-400 mb-1">Email</p>
            <p className="font-medium text-gray-800">{user?.email}</p>
          </div>
          <div>
            <p className="text-gray-400 mb-1">Rol</p>
            <p className="font-medium text-gray-800">{user?.role}</p>
          </div>
          {user?.company && (
            <div>
              <p className="text-gray-400 mb-1">Empresa</p>
              <p className="font-medium text-gray-800">{user.company.name}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 bg-navy-50 rounded-xl border border-navy-100 p-5">
        <p className="text-sm text-navy-700 font-medium mb-1">Más opciones próximamente</p>
        <p className="text-xs text-navy-500">Cambio de contraseña, notificaciones y preferencias estarán disponibles en la siguiente versión.</p>
      </div>
    </div>
  );
}
