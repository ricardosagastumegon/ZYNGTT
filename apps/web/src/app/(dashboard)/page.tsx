'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function DashboardIndexPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }

    switch (user.role) {
      case 'EMPRESA':
        router.replace('/dashboard/empresa');
        break;
      case 'TRANSPORTISTA':
        router.replace('/dashboard/transporte');
        break;
      case 'AGENTE':
        router.replace('/dashboard/agente');
        break;
      case 'ADMIN':
      case 'SUPERADMIN':
        router.replace('/dashboard/admin');
        break;
      default:
        router.replace('/dashboard/empresa');
    }
  }, [user, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-primary)]" />
    </div>
  );
}
