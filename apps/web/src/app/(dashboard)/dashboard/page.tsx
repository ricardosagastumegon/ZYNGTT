'use client';
import { useEffect } from 'react';
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

  useEffect(() => {
    const target = user ? (ROLE_ROUTES[user.role] ?? '/dashboard/empresa') : '/login';
    router.replace(target);
  }, [user, router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-700" />
    </div>
  );
}
