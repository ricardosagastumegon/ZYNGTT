import { MAGARequirements, DocumentChecklistItem, TributeCalculation } from '../types/cfdi.types';

const GTQ_PER_USD = 7.75; // Tipo de cambio referencial

export const HS_MAGA_REQUIREMENTS: Record<string, Omit<MAGARequirements, 'hsCode'>> = {
  // ─── CAPÍTULO 07: Hortalizas ───────────────────────────────────────────────
  '0701': { category: 'Papas frescas', requiresFitosanitario: true, requiresZoosanitario: false, requiresLab: false, requiresQuarantine: false, daiRate: 15, notes: 'Inspección visual en frontera, posible muestreo', documents: ['FITO_MX', 'FITO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO'], processType: 'VEGETAL', estimatedDays: 2 },
  '0702': { category: 'Tomates frescos', requiresFitosanitario: true, requiresZoosanitario: false, requiresLab: true, requiresQuarantine: false, labType: 'LAB_KM22', daiRate: 15, notes: 'Posible análisis de plagas cuarentenarias Tuta absoluta', documents: ['FITO_MX', 'FITO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO', 'ANALISIS_LAB'], processType: 'VEGETAL', estimatedDays: 4 },
  '0703': { category: 'Cebollas, ajos', requiresFitosanitario: true, requiresZoosanitario: false, requiresLab: false, requiresQuarantine: false, daiRate: 15, notes: 'Verificar ausencia de Ditylenchus dipsaci', documents: ['FITO_MX', 'FITO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO'], processType: 'VEGETAL', estimatedDays: 2 },
  '0704': { category: 'Coles y brassicas', requiresFitosanitario: true, requiresZoosanitario: false, requiresLab: true, requiresQuarantine: false, labType: 'LAB_KM22', daiRate: 15, notes: 'Análisis fitosanitario obligatorio', documents: ['FITO_MX', 'FITO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO', 'ANALISIS_LAB'], processType: 'VEGETAL', estimatedDays: 4 },
  '0705': { category: 'Lechugas y achicorias', requiresFitosanitario: true, requiresZoosanitario: false, requiresLab: false, requiresQuarantine: false, daiRate: 15, notes: 'Inspección visual', documents: ['FITO_MX', 'FITO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO'], processType: 'VEGETAL', estimatedDays: 1 },
  '0706': { category: 'Zanahorias, rábanos', requiresFitosanitario: true, requiresZoosanitario: false, requiresLab: false, requiresQuarantine: false, daiRate: 15, notes: 'Requiere libre de tierra/sustrato', documents: ['FITO_MX', 'FITO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO'], processType: 'VEGETAL', estimatedDays: 2 },
  '0707': { category: 'Pepinos y cohombros', requiresFitosanitario: true, requiresZoosanitario: false, requiresLab: false, requiresQuarantine: false, daiRate: 15, notes: 'Inspección visual', documents: ['FITO_MX', 'FITO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO'], processType: 'VEGETAL', estimatedDays: 2 },
  '0708': { category: 'Legumbres frescas', requiresFitosanitario: true, requiresZoosanitario: false, requiresLab: true, requiresQuarantine: false, labType: 'LAB_KM22', daiRate: 15, notes: 'Análisis de Callosobruchus sp.', documents: ['FITO_MX', 'FITO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO', 'ANALISIS_LAB'], processType: 'VEGETAL', estimatedDays: 5 },
  '0709': { category: 'Otras hortalizas', requiresFitosanitario: true, requiresZoosanitario: false, requiresLab: false, requiresQuarantine: false, daiRate: 15, notes: 'Inspección visual en frontera', documents: ['FITO_MX', 'FITO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO'], processType: 'VEGETAL', estimatedDays: 2 },
  '0710': { category: 'Hortalizas congeladas', requiresFitosanitario: true, requiresZoosanitario: false, requiresLab: false, requiresQuarantine: false, daiRate: 10, notes: 'Verificar temperatura cadena frío', documents: ['FITO_MX', 'FITO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO', 'CERT_TEMP'], processType: 'VEGETAL', estimatedDays: 2 },

  // ─── CAPÍTULO 08: Frutas ──────────────────────────────────────────────────
  '0801': { category: 'Cocos, nueces de Brasil', requiresFitosanitario: true, requiresZoosanitario: false, requiresLab: false, requiresQuarantine: false, daiRate: 15, notes: 'Inspección visual', documents: ['FITO_MX', 'FITO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO'], processType: 'VEGETAL', estimatedDays: 2 },
  '0802': { category: 'Frutos secos con cáscara', requiresFitosanitario: true, requiresZoosanitario: false, requiresLab: true, requiresQuarantine: false, labType: 'LAB_KM22', daiRate: 15, notes: 'Análisis de aflatoxinas y plagas', documents: ['FITO_MX', 'FITO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO', 'ANALISIS_LAB'], processType: 'VEGETAL', estimatedDays: 5 },
  '0803': { category: 'Bananas y plátanos', requiresFitosanitario: true, requiresZoosanitario: false, requiresLab: false, requiresQuarantine: false, daiRate: 20, notes: 'Plaga cuarentenaria: Fusarium oxysporum R4T', documents: ['FITO_MX', 'FITO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO'], processType: 'VEGETAL', estimatedDays: 2 },
  '0804': { category: 'Dátiles, higos, mangos', requiresFitosanitario: true, requiresZoosanitario: false, requiresLab: true, requiresQuarantine: false, labType: 'LAB_KM22', daiRate: 15, notes: 'Análisis de mosca de la fruta Ceratitis capitata', documents: ['FITO_MX', 'FITO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO', 'ANALISIS_LAB'], processType: 'VEGETAL', estimatedDays: 4 },
  '0805': { category: 'Cítricos (limones, naranjas)', requiresFitosanitario: true, requiresZoosanitario: false, requiresLab: true, requiresQuarantine: false, labType: 'LAB_KM22', daiRate: 15, notes: 'Análisis de Huanglongbing (HLB) y mosca de la fruta', documents: ['FITO_MX', 'FITO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO', 'ANALISIS_LAB'], processType: 'VEGETAL', estimatedDays: 5 },
  '0806': { category: 'Uvas', requiresFitosanitario: true, requiresZoosanitario: false, requiresLab: true, requiresQuarantine: false, labType: 'LAB_KM22', daiRate: 15, notes: 'Análisis de Plasmopara viticola y trips', documents: ['FITO_MX', 'FITO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO', 'ANALISIS_LAB'], processType: 'VEGETAL', estimatedDays: 4 },
  '0807': { category: 'Melones y sandías', requiresFitosanitario: true, requiresZoosanitario: false, requiresLab: false, requiresQuarantine: false, daiRate: 15, notes: 'Inspección visual, libre de tierra', documents: ['FITO_MX', 'FITO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO'], processType: 'VEGETAL', estimatedDays: 2 },
  '0808': { category: 'Manzanas y peras', requiresFitosanitario: true, requiresZoosanitario: false, requiresLab: true, requiresQuarantine: false, labType: 'LAB_KM22', daiRate: 15, notes: 'Plaga cuarentenaria: Cydia pomonella (carpocapsa)', documents: ['FITO_MX', 'FITO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO', 'ANALISIS_LAB'], processType: 'VEGETAL', estimatedDays: 5 },
  '0809': { category: 'Duraznos, cerezas, ciruelas', requiresFitosanitario: true, requiresZoosanitario: false, requiresLab: true, requiresQuarantine: false, labType: 'LAB_KM22', daiRate: 15, notes: 'Análisis mosca de la fruta y Monilinia fructicola', documents: ['FITO_MX', 'FITO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO', 'ANALISIS_LAB'], processType: 'VEGETAL', estimatedDays: 5 },
  '0810': { category: 'Otras frutas frescas', requiresFitosanitario: true, requiresZoosanitario: false, requiresLab: false, requiresQuarantine: false, daiRate: 15, notes: 'Inspección en frontera', documents: ['FITO_MX', 'FITO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO'], processType: 'VEGETAL', estimatedDays: 2 },

  // ─── CAPÍTULO 02: Carnes ──────────────────────────────────────────────────
  '0201': { category: 'Carne vacuna fresca', requiresFitosanitario: false, requiresZoosanitario: true, requiresLab: true, requiresQuarantine: false, labType: 'LAB_ZOOSANITARIO', daiRate: 25, notes: 'Establecimiento exportador debe estar en lista autorizada MAGA. Análisis microbiológico obligatorio.', documents: ['CERT_ZOO_MX', 'PERMISO_ZOO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO', 'ANALISIS_LAB', 'LISTA_ESTABLECIMIENTOS'], processType: 'ANIMAL', estimatedDays: 10 },
  '0202': { category: 'Carne vacuna congelada', requiresFitosanitario: false, requiresZoosanitario: true, requiresLab: true, requiresQuarantine: false, labType: 'LAB_ZOOSANITARIO', daiRate: 25, notes: 'Igual que fresca + cadena de frío certificada', documents: ['CERT_ZOO_MX', 'PERMISO_ZOO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO', 'ANALISIS_LAB', 'CERT_TEMP'], processType: 'ANIMAL', estimatedDays: 10 },
  '0203': { category: 'Carne porcina', requiresFitosanitario: false, requiresZoosanitario: true, requiresLab: true, requiresQuarantine: false, labType: 'LAB_ZOOSANITARIO', daiRate: 25, notes: 'Vigilancia Fiebre Porcina Africana. Establecimiento autorizado.', documents: ['CERT_ZOO_MX', 'PERMISO_ZOO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO', 'ANALISIS_LAB'], processType: 'ANIMAL', estimatedDays: 10 },
  '0207': { category: 'Carne avícola', requiresFitosanitario: false, requiresZoosanitario: true, requiresLab: true, requiresQuarantine: false, labType: 'LAB_ZOOSANITARIO', daiRate: 25, notes: 'Vigilancia Influenza Aviar. Certificado sanitario establecimiento.', documents: ['CERT_ZOO_MX', 'PERMISO_ZOO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO', 'ANALISIS_LAB'], processType: 'ANIMAL', estimatedDays: 10 },

  // ─── CAPÍTULO 04: Lácteos y huevos ───────────────────────────────────────
  '0401': { category: 'Leche fresca', requiresFitosanitario: false, requiresZoosanitario: true, requiresLab: true, requiresQuarantine: false, labType: 'LAB_ZOOSANITARIO', daiRate: 20, notes: 'Análisis microbiológico y fisicoquímico. Pasteurización certificada.', documents: ['CERT_ZOO_MX', 'PERMISO_ZOO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO', 'ANALISIS_LAB', 'CERT_PASTEURIZACION'], processType: 'ANIMAL', estimatedDays: 8 },
  '0402': { category: 'Leche en polvo y condensada', requiresFitosanitario: false, requiresZoosanitario: true, requiresLab: true, requiresQuarantine: false, labType: 'LAB_ZOOSANITARIO', daiRate: 20, notes: 'Requiere registro sanitario MSPAS Guatemala', documents: ['CERT_ZOO_MX', 'PERMISO_ZOO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO', 'ANALISIS_LAB', 'REG_SANITARIO_MSPAS'], processType: 'ANIMAL', estimatedDays: 8 },
  '0406': { category: 'Quesos', requiresFitosanitario: false, requiresZoosanitario: true, requiresLab: true, requiresQuarantine: false, labType: 'LAB_ZOOSANITARIO', daiRate: 20, notes: 'Registro sanitario MSPAS + análisis microbiológico', documents: ['CERT_ZOO_MX', 'PERMISO_ZOO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO', 'ANALISIS_LAB', 'REG_SANITARIO_MSPAS'], processType: 'ANIMAL', estimatedDays: 10 },

  // ─── CAPÍTULO 10: Cereales y granos ──────────────────────────────────────
  '1001': { category: 'Trigo y morcajo', requiresFitosanitario: true, requiresZoosanitario: false, requiresLab: true, requiresQuarantine: true, quarantineDays: 5, labType: 'LAB_KM22', daiRate: 0, tlcApplies: true, notes: 'TLC México-CA aplica. Análisis plagas cuarentenarias obligatorio. Karnal bunt vigilancia.', documents: ['FITO_MX', 'FITO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO', 'ANALISIS_LAB', 'CUARENTENA', 'CERT_TLC'], processType: 'GRAIN', estimatedDays: 8 },
  '1002': { category: 'Centeno', requiresFitosanitario: true, requiresZoosanitario: false, requiresLab: true, requiresQuarantine: false, labType: 'LAB_KM22', daiRate: 0, tlcApplies: true, notes: 'TLC aplica. Análisis de plagas almacenadas.', documents: ['FITO_MX', 'FITO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO', 'ANALISIS_LAB'], processType: 'GRAIN', estimatedDays: 7 },
  '1005': { category: 'Maíz', requiresFitosanitario: true, requiresZoosanitario: false, requiresLab: true, requiresQuarantine: true, quarantineDays: 3, labType: 'LAB_KM22', daiRate: 0, tlcApplies: true, notes: 'TLC aplica. Análisis de Maize Streak Virus y gorgojos. Verificar no sea OGM no autorizado.', documents: ['FITO_MX', 'FITO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO', 'ANALISIS_LAB', 'CUARENTENA', 'CERT_NO_OGM'], processType: 'GRAIN', estimatedDays: 6 },
  '1006': { category: 'Arroz', requiresFitosanitario: true, requiresZoosanitario: false, requiresLab: true, requiresQuarantine: false, labType: 'LAB_KM22', daiRate: 10, notes: 'Análisis de plagas en grano almacenado', documents: ['FITO_MX', 'FITO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO', 'ANALISIS_LAB'], processType: 'GRAIN', estimatedDays: 5 },
  '1007': { category: 'Sorgo', requiresFitosanitario: true, requiresZoosanitario: false, requiresLab: true, requiresQuarantine: false, labType: 'LAB_KM22', daiRate: 0, tlcApplies: true, notes: 'TLC aplica. Análisis de Sorghum mosaic virus', documents: ['FITO_MX', 'FITO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO', 'ANALISIS_LAB'], processType: 'GRAIN', estimatedDays: 6 },

  // ─── CAPÍTULO 11: Harinas ──────────────────────────────────────────────────
  '1101': { category: 'Harina de trigo', requiresFitosanitario: true, requiresZoosanitario: false, requiresLab: false, requiresQuarantine: false, daiRate: 0, tlcApplies: true, notes: 'TLC aplica. Registro sanitario MSPAS si es para consumo humano directo.', documents: ['FITO_MX', 'FITO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO', 'REG_SANITARIO_MSPAS'], processType: 'PROCESSED', estimatedDays: 3 },
  '1102': { category: 'Harina de maíz/otros cereales', requiresFitosanitario: true, requiresZoosanitario: false, requiresLab: false, requiresQuarantine: false, daiRate: 0, tlcApplies: true, notes: 'TLC aplica. Registro sanitario MSPAS.', documents: ['FITO_MX', 'FITO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO', 'REG_SANITARIO_MSPAS'], processType: 'PROCESSED', estimatedDays: 3 },

  // ─── CAPÍTULO 15: Grasas y aceites ───────────────────────────────────────
  '1507': { category: 'Aceite de soya', requiresFitosanitario: false, requiresZoosanitario: false, requiresLab: false, requiresQuarantine: false, daiRate: 0, tlcApplies: true, notes: 'TLC aplica. Registro sanitario MSPAS.', documents: ['FACTURA', 'PACKING', 'PEDIMENTO', 'REG_SANITARIO_MSPAS'], processType: 'PROCESSED', estimatedDays: 3 },
  '1511': { category: 'Aceite de palma', requiresFitosanitario: true, requiresZoosanitario: false, requiresLab: false, requiresQuarantine: false, daiRate: 0, notes: 'Permiso fitosanitario para riesgo Palm lethal yellowing', documents: ['FITO_MX', 'FACTURA', 'PACKING', 'PEDIMENTO'], processType: 'PROCESSED', estimatedDays: 3 },
  '1512': { category: 'Aceite de girasol/cártamo', requiresFitosanitario: false, requiresZoosanitario: false, requiresLab: false, requiresQuarantine: false, daiRate: 0, tlcApplies: true, notes: 'TLC aplica. Registro MSPAS.', documents: ['FACTURA', 'PACKING', 'PEDIMENTO', 'REG_SANITARIO_MSPAS'], processType: 'PROCESSED', estimatedDays: 2 },

  // ─── CAPÍTULO 16: Preparaciones cárneas ──────────────────────────────────
  '1601': { category: 'Embutidos y salchichas', requiresFitosanitario: false, requiresZoosanitario: false, requiresLab: false, requiresQuarantine: false, daiRate: 15, notes: 'Registro sanitario MSPAS obligatorio. Primera importación requiere aprobación previa.', documents: ['FACTURA', 'PACKING', 'PEDIMENTO', 'REG_SANITARIO_MSPAS', 'ETIQUETADO'], processType: 'PROCESSED', estimatedDays: 7 },
  '1602': { category: 'Conservas de carne', requiresFitosanitario: false, requiresZoosanitario: false, requiresLab: false, requiresQuarantine: false, daiRate: 15, notes: 'Registro sanitario MSPAS. Verificar etiquetado en español.', documents: ['FACTURA', 'PACKING', 'PEDIMENTO', 'REG_SANITARIO_MSPAS', 'ETIQUETADO'], processType: 'PROCESSED', estimatedDays: 7 },

  // ─── CAPÍTULO 19: Preparaciones de cereales ──────────────────────────────
  '1901': { category: 'Preparaciones de malta/harina', requiresFitosanitario: false, requiresZoosanitario: false, requiresLab: false, requiresQuarantine: false, daiRate: 10, notes: 'Registro sanitario MSPAS. Etiquetado en español.', documents: ['FACTURA', 'PACKING', 'PEDIMENTO', 'REG_SANITARIO_MSPAS', 'ETIQUETADO'], processType: 'PROCESSED', estimatedDays: 7 },
  '1902': { category: 'Pastas alimenticias', requiresFitosanitario: false, requiresZoosanitario: false, requiresLab: false, requiresQuarantine: false, daiRate: 10, notes: 'Registro sanitario MSPAS. Etiquetado en español.', documents: ['FACTURA', 'PACKING', 'PEDIMENTO', 'REG_SANITARIO_MSPAS', 'ETIQUETADO'], processType: 'PROCESSED', estimatedDays: 5 },
  '1905': { category: 'Pan, galletas, pasteles', requiresFitosanitario: false, requiresZoosanitario: false, requiresLab: false, requiresQuarantine: false, daiRate: 10, notes: 'Registro sanitario MSPAS. Verificar fechas de vencimiento.', documents: ['FACTURA', 'PACKING', 'PEDIMENTO', 'REG_SANITARIO_MSPAS', 'ETIQUETADO'], processType: 'PROCESSED', estimatedDays: 5 },

  // ─── CAPÍTULO 20: Conservas vegetales ────────────────────────────────────
  '2001': { category: 'Hortalizas en conserva/vinagre', requiresFitosanitario: false, requiresZoosanitario: false, requiresLab: false, requiresQuarantine: false, daiRate: 10, notes: 'Registro sanitario MSPAS. Etiquetado en español.', documents: ['FACTURA', 'PACKING', 'PEDIMENTO', 'REG_SANITARIO_MSPAS', 'ETIQUETADO'], processType: 'PROCESSED', estimatedDays: 5 },
  '2002': { category: 'Tomates en conserva', requiresFitosanitario: false, requiresZoosanitario: false, requiresLab: false, requiresQuarantine: false, daiRate: 10, notes: 'Registro sanitario MSPAS.', documents: ['FACTURA', 'PACKING', 'PEDIMENTO', 'REG_SANITARIO_MSPAS', 'ETIQUETADO'], processType: 'PROCESSED', estimatedDays: 5 },
  '2009': { category: 'Jugos de fruta', requiresFitosanitario: false, requiresZoosanitario: false, requiresLab: false, requiresQuarantine: false, daiRate: 10, notes: 'Registro sanitario MSPAS. Análisis bromatológico puede requerirse.', documents: ['FACTURA', 'PACKING', 'PEDIMENTO', 'REG_SANITARIO_MSPAS', 'ETIQUETADO'], processType: 'PROCESSED', estimatedDays: 5 },

  // ─── CAPÍTULO 21: Preparaciones alimenticias diversas ─────────────────────
  '2101': { category: 'Extractos de café/té/achicoria', requiresFitosanitario: false, requiresZoosanitario: false, requiresLab: false, requiresQuarantine: false, daiRate: 10, notes: 'Registro sanitario MSPAS.', documents: ['FACTURA', 'PACKING', 'PEDIMENTO', 'REG_SANITARIO_MSPAS', 'ETIQUETADO'], processType: 'PROCESSED', estimatedDays: 5 },
  '2106': { category: 'Preparaciones alimenticias NEP', requiresFitosanitario: false, requiresZoosanitario: false, requiresLab: false, requiresQuarantine: false, daiRate: 10, notes: 'Registro sanitario MSPAS obligatorio. Primera importación más lenta.', documents: ['FACTURA', 'PACKING', 'PEDIMENTO', 'REG_SANITARIO_MSPAS', 'ETIQUETADO', 'FORMULA_COMPOSICION'], processType: 'PROCESSED', estimatedDays: 10 },

  // ─── CAPÍTULO 22: Bebidas ─────────────────────────────────────────────────
  '2201': { category: 'Agua embotellada', requiresFitosanitario: false, requiresZoosanitario: false, requiresLab: true, requiresQuarantine: false, labType: 'LAB_QUETZAL', daiRate: 0, notes: 'Análisis fisicoquímico y microbiológico. Registro sanitario MSPAS.', documents: ['FACTURA', 'PACKING', 'PEDIMENTO', 'REG_SANITARIO_MSPAS', 'ANALISIS_LAB', 'ETIQUETADO'], processType: 'PROCESSED', estimatedDays: 7 },
  '2202': { category: 'Aguas con gas/bebidas', requiresFitosanitario: false, requiresZoosanitario: false, requiresLab: false, requiresQuarantine: false, daiRate: 10, notes: 'Registro sanitario MSPAS. Etiquetado en español.', documents: ['FACTURA', 'PACKING', 'PEDIMENTO', 'REG_SANITARIO_MSPAS', 'ETIQUETADO'], processType: 'PROCESSED', estimatedDays: 5 },
  '2208': { category: 'Bebidas alcohólicas destiladas', requiresFitosanitario: false, requiresZoosanitario: false, requiresLab: false, requiresQuarantine: false, daiRate: 25, notes: 'Stickers impuesto SAT Guatemala. Permiso especial SAT. Registro MSPAS.', documents: ['FACTURA', 'PACKING', 'PEDIMENTO', 'REG_SANITARIO_MSPAS', 'PERMISO_SAT_BEBIDAS', 'ETIQUETADO'], processType: 'PROCESSED', estimatedDays: 15 },
  '2204': { category: 'Vinos', requiresFitosanitario: false, requiresZoosanitario: false, requiresLab: false, requiresQuarantine: false, daiRate: 20, notes: 'Stickers impuesto SAT. Registro MSPAS.', documents: ['FACTURA', 'PACKING', 'PEDIMENTO', 'REG_SANITARIO_MSPAS', 'PERMISO_SAT_BEBIDAS', 'ETIQUETADO'], processType: 'PROCESSED', estimatedDays: 12 },

  // Default
  default: { category: 'Alimento genérico', requiresFitosanitario: true, requiresZoosanitario: false, requiresLab: false, requiresQuarantine: false, daiRate: 15, notes: 'Verificar requisitos específicos con MAGA/VISAR', documents: ['FITO_MX', 'FITO_GT', 'FACTURA', 'PACKING', 'PEDIMENTO'], processType: 'VEGETAL', estimatedDays: 3 },
};

export const DOCUMENT_LABELS: Record<string, string> = {
  FITO_MX: 'Certificado Fitosanitario México (SENASICA)',
  FITO_GT: 'Constancia Fitosanitaria Guatemala (MAGA/VISAR)',
  CERT_ZOO_MX: 'Certificado Zoosanitario México (SENASICA)',
  PERMISO_ZOO_GT: 'Permiso Zoosanitario Guatemala (MAGA/VISAR)',
  FACTURA: 'Factura Comercial / CFDI',
  PACKING: 'Lista de Empaque (Packing List)',
  PEDIMENTO: 'Pedimento de Exportación México',
  ANALISIS_LAB: 'Resultado de Análisis de Laboratorio',
  CUARENTENA: 'Constancia de Cumplimiento de Cuarentena',
  CERT_TLC: 'Certificado de Origen TLC México-CA',
  CERT_NO_OGM: 'Declaración No-OGM',
  CERT_TEMP: 'Certificado de Temperatura (cadena frío)',
  REG_SANITARIO_MSPAS: 'Registro Sanitario MSPAS Guatemala',
  ETIQUETADO: 'Etiqueta en español aprobada',
  LISTA_ESTABLECIMIENTOS: 'Constancia Establecimiento Autorizado MAGA',
  CERT_PASTEURIZACION: 'Certificado de Pasteurización',
  PERMISO_SAT_BEBIDAS: 'Permiso SAT para bebidas alcohólicas',
  FORMULA_COMPOSICION: 'Fórmula y composición del producto',
  DUCA_D: 'DUCA-D (Declaración Única Centroamericana - Determinación)',
};

export function getMAGARequirements(hsCode: string): MAGARequirements {
  const prefix4 = hsCode.slice(0, 4);
  const prefix2 = hsCode.slice(0, 2);
  const data =
    HS_MAGA_REQUIREMENTS[prefix4] ??
    HS_MAGA_REQUIREMENTS[prefix2] ??
    HS_MAGA_REQUIREMENTS['default'];
  return { hsCode: prefix4, ...data };
}

export function getDocumentChecklist(hsCode: string): DocumentChecklistItem[] {
  const req = getMAGARequirements(hsCode);
  return req.documents.map(code => ({
    code,
    label: DOCUMENT_LABELS[code] ?? code,
    required: true,
    uploaded: false,
    description: getDocDescription(code, req),
  }));
}

function getDocDescription(code: string, req: MAGARequirements): string {
  if (code === 'ANALISIS_LAB' && req.labType) return `Laboratorio: ${LAB_LABELS[req.labType] ?? req.labType}`;
  if (code === 'CUARENTENA' && req.quarantineDays) return `Mínimo ${req.quarantineDays} días de cuarentena`;
  return '';
}

export const LAB_LABELS: Record<string, string> = {
  LAB_KM22: 'Laboratorio Diagnóstico Fitosanitario Km 22 (Guatemala City)',
  LAB_QUETZAL: 'Laboratorio MAGA Xela (Quetzaltenango)',
  LAB_PETEN: 'Laboratorio MAGA Petén',
  LAB_ZOOSANITARIO: 'Laboratorio Sanidad Animal MAGA',
};

export function calculateTributes(hsCode: string, cifValueUSD: number): TributeCalculation {
  const req = getMAGARequirements(hsCode);
  const exchangeRate = GTQ_PER_USD;
  const cifValueGTQ = cifValueUSD * exchangeRate;
  const daiAmount = cifValueGTQ * (req.daiRate / 100);
  const ivaBase = cifValueGTQ + daiAmount;
  const ivaAmount = ivaBase * 0.12;
  return {
    cifValueUSD,
    cifValueGTQ,
    daiRate: req.daiRate,
    daiAmount,
    ivaBase,
    ivaAmount,
    totalTributes: daiAmount + ivaAmount,
    exchangeRate,
  };
}

export function calculateCIFValue(
  commercialValueUSD: number,
  incoterm: string,
  freightCostUSD = 350,
  insuranceCostUSD?: number
): number {
  const insurance = insuranceCostUSD ?? commercialValueUSD * 0.003;
  switch (incoterm.toUpperCase()) {
    case 'CIF': return commercialValueUSD;
    case 'FOB': return commercialValueUSD + freightCostUSD + insurance;
    case 'EXW': return commercialValueUSD + freightCostUSD * 1.5 + insurance;
    case 'CFR': return commercialValueUSD + insurance;
    default: return commercialValueUSD + freightCostUSD + insurance;
  }
}
