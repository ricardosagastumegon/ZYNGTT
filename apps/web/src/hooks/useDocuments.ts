'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useDocuments(shipmentId: string) {
  return useQuery({
    queryKey: ['documents', shipmentId],
    queryFn: async () => (await api.get(`/api/documents/${shipmentId}`)).data.data,
    enabled: !!shipmentId,
  });
}

export function useUploadDocument(shipmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      api.post(`/api/documents/upload/${shipmentId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents', shipmentId] }),
  });
}

export function useDeleteDocument(shipmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/documents/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents', shipmentId] }),
  });
}
