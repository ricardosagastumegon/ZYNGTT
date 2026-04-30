'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

const ROLE_ROUTES: Record<string, string> = {
  SUPERADMIN: '/dashboard/admin',
  ADMIN:      '/dashboard/admin',
  EMPRESA:    '/dashboard/empresa',
  AGENTE:     '/dashboard/agente',
  TRANSPORTISTA: '/dashboard/transporte',
};

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!user) return;
    router.replace(ROLE_ROUTES[user.role] ?? '/dashboard/empresa');
  }, [user, router]);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 10_000);
    return () => clearTimeout(t);
  }, []);

  if (timedOut) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <p className="text-gray-500 text-sm">No se pudo cargar el dashboard.</p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Reintentar
      </button>
    </div>
  );

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );
}
