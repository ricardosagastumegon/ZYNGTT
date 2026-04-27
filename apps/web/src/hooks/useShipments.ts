'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useShipments(filters?: Record<string, string>, page = 1) {
  const params = new URLSearchParams({ page: String(page), ...filters });
  return useQuery({
    queryKey: ['shipments', filters, page],
    queryFn: async () => (await api.get(`/api/shipments?${params}`)).data.data,
  });
}

export function useShipment(id: string) {
  return useQuery({
    queryKey: ['shipment', id],
    queryFn: async () => (await api.get(`/api/shipments/${id}`)).data.data,
    enabled: !!id,
  });
}

export function useUpdateShipmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      api.put(`/api/shipments/${id}/status`, { status, notes }).then(r => r.data.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['shipment', id] });
      qc.invalidateQueries({ queryKey: ['shipments'] });
    },
  });
}
