'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/lib/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string, refreshToken: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; path=/; expires=${expires}; SameSite=Lax`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      login: (user, token, refreshToken) => {
        localStorage.setItem('zyn_token', token);
        localStorage.setItem('zyn_refresh_token', refreshToken);
        setCookie('zyn_token', token, 7);
        set({ user, token, refreshToken, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem('zyn_token');
        localStorage.removeItem('zyn_refresh_token');
        deleteCookie('zyn_token');
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
      },
      setUser: (user) => set({ user }),
    }),
    { name: 'zyn_auth', partialize: (s) => ({ user: s.user, token: s.token, refreshToken: s.refreshToken }) }
  )
);
