export interface CustomsRequirement {
  hsCodePrefix: string;
  category: string;
  tariffRate: number;
  requiredDocs: string[];
  notes?: string;
}

export const CUSTOMS_REQUIREMENTS: CustomsRequirement[] = [
  { hsCodePrefix: '07', category: 'Frutas y Verduras', tariffRate: 15, requiredDocs: ['COMMERCIAL_INVOICE', 'PACKING_LIST', 'CERTIFICATE_OF_ORIGIN', 'CUSTOMS_DECLARATION'], notes: 'Requiere certificado fitosanitario' },
  { hsCodePrefix: '08', category: 'Frutas (tropicales)', tariffRate: 20, requiredDocs: ['COMMERCIAL_INVOICE', 'PACKING_LIST', 'CERTIFICATE_OF_ORIGIN', 'CUSTOMS_DECLARATION'], notes: 'Requiere certificado fitosanitario' },
  { hsCodePrefix: '62', category: 'Textiles y Ropa', tariffRate: 10, requiredDocs: ['COMMERCIAL_INVOICE', 'PACKING_LIST', 'CERTIFICATE_OF_ORIGIN', 'CUSTOMS_DECLARATION', 'BILL_OF_LADING'] },
  { hsCodePrefix: '85', category: 'Electrónica', tariffRate: 5, requiredDocs: ['COMMERCIAL_INVOICE', 'PACKING_LIST', 'CUSTOMS_DECLARATION', 'BILL_OF_LADING'], notes: 'Puede requerir certificación técnica' },
  { hsCodePrefix: '84', category: 'Maquinaria', tariffRate: 0, requiredDocs: ['COMMERCIAL_INVOICE', 'PACKING_LIST', 'CUSTOMS_DECLARATION', 'BILL_OF_LADING', 'CERTIFICATE_OF_ORIGIN'] },
  { hsCodePrefix: '30', category: 'Productos Farmacéuticos', tariffRate: 0, requiredDocs: ['COMMERCIAL_INVOICE', 'CUSTOMS_DECLARATION'], notes: 'Requiere registro sanitario del MSPAS' },
  { hsCodePrefix: '22', category: 'Bebidas Alcohólicas', tariffRate: 25, requiredDocs: ['COMMERCIAL_INVOICE', 'PACKING_LIST', 'CUSTOMS_DECLARATION', 'CERTIFICATE_OF_ORIGIN'], notes: 'Requiere stickers de impuesto' },
  { hsCodePrefix: '24', category: 'Tabaco', tariffRate: 40, requiredDocs: ['COMMERCIAL_INVOICE', 'PACKING_LIST', 'CUSTOMS_DECLARATION'], notes: 'Alta tasa arancelaria' },
];

export function getRequirementsByHsCode(hsCode: string): CustomsRequirement | null {
  const prefix = hsCode.slice(0, 2);
  return CUSTOMS_REQUIREMENTS.find(r => r.hsCodePrefix === prefix) ?? null;
}

export const STANDARD_DOCS = ['COMMERCIAL_INVOICE', 'PACKING_LIST', 'CUSTOMS_DECLARATION', 'BILL_OF_LADING'];
