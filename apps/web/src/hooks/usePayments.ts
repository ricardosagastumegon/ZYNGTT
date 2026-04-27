'use client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function usePaymentHistory() {
  return useQuery({
    queryKey: ['payments'],
    queryFn: async () => (await api.get('/api/payments/history')).data.data,
  });
}

export function useInitiatePayment() {
  return useMutation({
    mutationFn: (shipmentId: string) =>
      api.post(`/api/payments/initiate/${shipmentId}`).then(r => r.data.data),
  });
}
