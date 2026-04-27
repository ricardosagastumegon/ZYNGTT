'use client';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { loginRequest, registerRequest, logoutRequest } from '@/lib/auth';

export function useAuth() {
  const router = useRouter();
  const { user, token, isAuthenticated, login, logout, setUser } = useAuthStore();

  const handleLogin = useCallback(async (email: string, password: string) => {
    const data = await loginRequest(email, password);
    login(data.user, data.token, data.refreshToken);
    router.push('/dashboard');
  }, [login, router]);

  const handleRegister = useCallback(async (formData: Parameters<typeof registerRequest>[0]) => {
    const data = await registerRequest(formData);
    login(data.user, data.token, data.refreshToken);
    router.push('/dashboard');
  }, [login, router]);

  const handleLogout = useCallback(async () => {
    const refreshToken = localStorage.getItem('zyn_refresh_token') || '';
    await logoutRequest(refreshToken).catch(() => {});
    logout();
    router.push('/login');
  }, [logout, router]);

  return { user, token, isAuthenticated, login: handleLogin, register: handleRegister, logout: handleLogout, setUser };
}
