'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useTrackingEvents(shipmentId: string) {
  return useQuery({
    queryKey: ['tracking', shipmentId],
    queryFn: async () => (await api.get(`/api/tracking/shipment/${shipmentId}`)).data.data,
    enabled: !!shipmentId,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function usePublicTracking(trackingNumber: string) {
  return useQuery({
    queryKey: ['tracking-public', trackingNumber],
    queryFn: async () => (await api.get(`/api/tracking/${trackingNumber}`)).data.data,
    enabled: !!trackingNumber,
  });
}

export function useSyncTracking(shipmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/api/tracking/sync/${shipmentId}`).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tracking', shipmentId] }),
  });
}
