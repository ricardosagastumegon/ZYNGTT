import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface FoodImportRecord {
  id: string;
  shipmentId: string;
  cfdiFolio: string;
  cfdiSerie?: string;
  cfdiFecha: string;
  exporterName: string;
  exporterRFC: string;
  importerName: string;
  importerNIT: string;
  hsCode: string;
  productDescription: string;
  incoterm: string;
  commercialValueUSD: number;
  freightCostUSD: number;
  cifValueUSD: number;
  daiRate: number;
  daiAmountGTQ: number;
  ivaAmountGTQ: number;
  totalTributesGTQ: number;
  exchangeRate: number;
  requiresFitosanitario: boolean;
  requiresZoosanitario: boolean;
  requiresLab: boolean;
  requiresQuarantine: boolean;
  quarantineDays?: number;
  labType?: string;
  estimatedProcessDays: number;
  pointOfEntry: string;
  sigieRequestNumber?: string;
  labResult?: string;
  status: string;
  createdAt: string;
  shipment?: { reference: string; status: string };
  maga?: {
    category: string;
    processType: string;
    notes: string;
    documents: string[];
  };
  tributes?: {
    cifValueUSD: number;
    cifValueGTQ: number;
    daiRate: number;
    daiAmount: number;
    ivaBase: number;
    ivaAmount: number;
    totalTributes: number;
    exchangeRate: number;
  };
  documents?: Array<{ code: string; label: string; required: boolean; category: string }>;
}

export function useFoodImports(page = 1, limit = 10) {
  return useQuery({
    queryKey: ['food-imports', page, limit],
    queryFn: async () => {
      const { data } = await api.get(`/food-imports?page=${page}&limit=${limit}`);
      return data.data as { items: FoodImportRecord[]; total: number; page: number; limit: number };
    },
  });
}

export function useFoodImport(id: string) {
  return useQuery({
    queryKey: ['food-imports', id],
    queryFn: async () => {
      const { data } = await api.get(`/food-imports/${id}`);
      return data.data as FoodImportRecord;
    },
    enabled: !!id,
  });
}

export function useCreateFoodImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await api.post('/food-imports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data as FoodImportRecord;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['food-imports'] }),
  });
}

export function useUpdateFoodImportStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const { data } = await api.patch(`/food-imports/${id}/status`, { status, notes });
      return data.data as FoodImportRecord;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['food-imports', vars.id] });
      qc.invalidateQueries({ queryKey: ['food-imports'] });
    },
  });
}

export function useSIGIEForm(id: string, enabled = false) {
  return useQuery({
    queryKey: ['food-imports', id, 'sigie-form'],
    queryFn: async () => {
      const { data } = await api.get(`/food-imports/${id}/sigie-form`);
      return data.data;
    },
    enabled: !!id && enabled,
  });
}

export function useRecalculateTributes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id, incoterm, freightCostUSD, insuranceCostUSD,
    }: { id: string; incoterm: string; freightCostUSD: number; insuranceCostUSD?: number }) => {
      const { data } = await api.post(`/food-imports/${id}/recalculate`, {
        incoterm, freightCostUSD, insuranceCostUSD,
      });
      return data.data;
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['food-imports', vars.id] }),
  });
}
