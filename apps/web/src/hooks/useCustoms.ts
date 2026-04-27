'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useCustomsRecord(shipmentId: string) {
  return useQuery({
    queryKey: ['customs', shipmentId],
    queryFn: async () => (await api.get(`/api/customs/${shipmentId}`)).data.data,
    enabled: !!shipmentId,
  });
}

export function useCustomsChecklist(shipmentId: string) {
  return useQuery({
    queryKey: ['customs-checklist', shipmentId],
    queryFn: async () => (await api.get(`/api/customs/${shipmentId}/checklist`)).data.data,
    enabled: !!shipmentId,
  });
}

export function useHsCodeRequirements(hsCode: string) {
  return useQuery({
    queryKey: ['hs-requirements', hsCode],
    queryFn: async () => (await api.get(`/api/customs/requirements/${hsCode}`)).data.data,
    enabled: hsCode.length >= 4,
  });
}

export function useSaveCustomsRecord(shipmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post(`/api/customs/${shipmentId}`, data).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customs', shipmentId] }),
  });
}
