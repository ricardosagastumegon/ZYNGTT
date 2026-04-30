export interface CFDIEmisor {
  nombre: string;
  rfc: string;
  regimenFiscal: string;
  domicilio?: string;
}

export interface CFDIReceptor {
  nombre: string;
  rfc: string;
  domicilioFiscal?: string;
  usoCFDI?: string;
}

export interface CFDIConcepto {
  descripcion: string;
  cantidad: number;
  claveUnidad: string;
  claveProdServ: string;
  valorUnitario: number;
  importe: number;
  noIdentificacion?: string;
}

export interface CFDIMercancia {
  fraccionArancelaria?: string;
  paisOrigenDestino?: string;
  descripcionIngles?: string;
  unidadAduana?: string;
  cantidadAduana?: number;
  valorDolares?: number;
  kilogramosNetos?: number;
}

export interface CFDIComercioExterior {
  version?: string;
  tipoOperacion?: string;
  claveDePedimento?: string;
  certificadoOrigen?: string;
  numCertificadoOrigen?: string;
  subdivisicion?: boolean;
  tipoCambioUSD?: number;
  totalUSD?: number;
  numRegIdTrib?: string;
  mercancias: CFDIMercancia[];
}

export interface CFDIData {
  version: string;
  folio?: string;
  serie?: string;
  fecha: string;
  subTotal: number;
  total: number;
  moneda: string;
  tipoCambio?: number;
  tipoDeComprobante: string;
  emisor: CFDIEmisor;
  receptor: CFDIReceptor;
  conceptos: CFDIConcepto[];
  comercioExterior?: CFDIComercioExterior;
  // HS code detectado automáticamente
  hsCodeDetected?: string;
  // Valor total en USD calculado
  totalUSD?: number;
}

export interface MAGARequirements {
  hsCode: string;
  category: string;
  requiresFitosanitario: boolean;
  requiresZoosanitario: boolean;
  requiresLab: boolean;
  requiresQuarantine: boolean;
  quarantineDays?: number;
  labType?: string;
  daiRate: number;
  notes: string;
  documents: string[];
  tlcApplies?: boolean;
  processType: 'VEGETAL' | 'ANIMAL' | 'PROCESSED' | 'GRAIN';
  estimatedDays: number;
}

export interface DocumentChecklistItem {
  code: string;
  label: string;
  required: boolean;
  uploaded: boolean;
  description?: string;
}

export interface TributeCalculation {
  cifValueUSD: number;
  cifValueGTQ: number;
  daiRate: number;
  daiAmount: number;
  ivaBase: number;
  ivaAmount: number;
  totalTributes: number;
  exchangeRate: number;
}
