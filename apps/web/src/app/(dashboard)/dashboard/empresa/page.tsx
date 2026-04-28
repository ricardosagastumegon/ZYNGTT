'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function EmpresaDashboard() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/dashboard'); }, [router]);
  return null;
}
