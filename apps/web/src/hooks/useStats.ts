'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => (await api.get('/api/stats/dashboard')).data,
    staleTime: 5 * 60 * 1000,
  });
}

export function useReport(from: string, to: string) {
  return useQuery({
    queryKey: ['report', from, to],
    queryFn: async () => (await api.get(`/api/stats/report?from=${from}&to=${to}`)).data.data,
    enabled: !!from && !!to,
  });
}
