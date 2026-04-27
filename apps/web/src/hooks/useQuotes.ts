'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useQuotes(page = 1) {
  return useQuery({
    queryKey: ['quotes', page],
    queryFn: async () => (await api.get(`/api/quotes?page=${page}`)).data.data,
  });
}

export function useCreateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/api/quotes', data).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotes'] }),
  });
}

export function useConvertQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/api/quotes/${id}/convert`).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotes'] });
      qc.invalidateQueries({ queryKey: ['shipments'] });
    },
  });
}
