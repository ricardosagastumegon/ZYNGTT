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
        set({ user, token, refreshToken, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem('zyn_token');
        localStorage.removeItem('zyn_refresh_token');
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
      },
      setUser: (user) => set({ user }),
    }),
    { name: 'zyn_auth', partialize: (s) => ({ token: s.token, refreshToken: s.refreshToken }) }
  )
);
