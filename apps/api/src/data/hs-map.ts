export interface HSInfo {
  nombre: string;
  nombreBotanico?: string;
  requiereRefrigeracion: boolean;
  requiereLabMX: boolean;
  labPlaga?: string;
  daiRate: number;
  tipoBulto: string;
  instrucciones: string[];
}

export interface Mercancia {
  fraccion: string;
  cantidadKG: number;
  valorUSD?: number;
  nombre?: string;
  descripcion?: string;
  cantidadBultos?: number;
  tipoBulto?: string;
}

export interface TributeCalc {
  cifUSD: number;
  cifGTQ: number;
  daiUSD: number;
  daiGTQ: number;
  ivaGTQ: number;
  totalTributosGTQ: number;
  desglose: { fraccion: string; daiRate: number; daiGTQ: number }[];
}

export const HS_MAP: Record<string, HSInfo> = {
  '0706100100': {
    nombre: 'ZANAHORIA',
    nombreBotanico: 'Daucus carota',
    requiereRefrigeracion: true,
    requiereLabMX: false,
    daiRate: 0.15,
    tipoBulto: 'BOLSA',
    instrucciones: ['MANTENER REFRIGERACIÓN', 'NO ROMPER CADENA DE FRÍO', 'TEMPERATURA: 0-4°C'],
  },
  '0704909999': {
    nombre: 'COL / REPOLLO',
    nombreBotanico: 'Brassica oleracea var. capitata',
    requiereRefrigeracion: true,
    requiereLabMX: true,
    labPlaga: 'Nacobbus aberrans',
    daiRate: 0.15,
    tipoBulto: 'ARPILLA',
    instrucciones: ['MANTENER REFRIGERACIÓN', 'NO ROMPER CADENA DE FRÍO', 'TEMPERATURA: 0-4°C'],
  },
  '0702000000': {
    nombre: 'TOMATE',
    nombreBotanico: 'Solanum lycopersicum',
    requiereRefrigeracion: true,
    requiereLabMX: false,
    daiRate: 0.15,
    tipoBulto: 'CAJA',
    instrucciones: ['MANTENER REFRIGERACIÓN', 'TEMPERATURA: 10-15°C', 'NO APILAR MÁS DE 6 CAJAS'],
  },
  '0703100000': {
    nombre: 'CEBOLLA',
    nombreBotanico: 'Allium cepa',
    requiereRefrigeracion: false,
    requiereLabMX: false,
    daiRate: 0.15,
    tipoBulto: 'ARPILLA',
    instrucciones: ['LUGAR FRESCO Y SECO', 'TEMPERATURA: 0-4°C', 'BUENA VENTILACIÓN'],
  },
  '0701900000': {
    nombre: 'PAPA',
    nombreBotanico: 'Solanum tuberosum',
    requiereRefrigeracion: false,
    requiereLabMX: true,
    labPlaga: 'Phthorimaea operculella',
    daiRate: 0.15,
    tipoBulto: 'COSTAL',
    instrucciones: ['LUGAR FRESCO Y SECO', 'EVITAR EXPOSICIÓN A LUZ DIRECTA', 'TEMPERATURA: 4-8°C'],
  },
  '0709200000': {
    nombre: 'ESPÁRRAGO',
    nombreBotanico: 'Asparagus officinalis',
    requiereRefrigeracion: true,
    requiereLabMX: false,
    daiRate: 0.15,
    tipoBulto: 'CAJA',
    instrucciones: ['MANTENER REFRIGERACIÓN', 'TEMPERATURA: 0-2°C', 'POSICIÓN VERTICAL'],
  },
  '0708200000': {
    nombre: 'EJOTE / VAINITA',
    nombreBotanico: 'Phaseolus vulgaris',
    requiereRefrigeracion: true,
    requiereLabMX: false,
    daiRate: 0.15,
    tipoBulto: 'CAJA',
    instrucciones: ['MANTENER REFRIGERACIÓN', 'TEMPERATURA: 4-8°C'],
  },
  '0714200000': {
    nombre: 'CAMOTE / BATATA',
    nombreBotanico: 'Ipomoea batatas',
    requiereRefrigeracion: false,
    requiereLabMX: false,
    daiRate: 0.15,
    tipoBulto: 'CAJA',
    instrucciones: ['LUGAR FRESCO Y SECO', 'TEMPERATURA: 12-15°C', 'EVITAR HUMEDAD'],
  },
  '0709600000': {
    nombre: 'CHILE / PIMIENTO',
    nombreBotanico: 'Capsicum annuum',
    requiereRefrigeracion: true,
    requiereLabMX: false,
    daiRate: 0.15,
    tipoBulto: 'CAJA',
    instrucciones: ['MANTENER REFRIGERACIÓN', 'TEMPERATURA: 7-10°C'],
  },
  '0807110000': {
    nombre: 'SANDÍA',
    nombreBotanico: 'Citrullus lanatus',
    requiereRefrigeracion: false,
    requiereLabMX: false,
    daiRate: 0.15,
    tipoBulto: 'UNIDAD',
    instrucciones: ['TEMPERATURA: 10-15°C', 'EVITAR GOLPES'],
  },
  '0805100000': {
    nombre: 'NARANJA',
    nombreBotanico: 'Citrus sinensis',
    requiereRefrigeracion: false,
    requiereLabMX: false,
    daiRate: 0.15,
    tipoBulto: 'CAJA',
    instrucciones: ['TEMPERATURA: 4-8°C', 'EVITAR HUMEDAD EXCESIVA'],
  },
  '0803901000': {
    nombre: 'PLÁTANO / BANANO',
    nombreBotanico: 'Musa paradisiaca',
    requiereRefrigeracion: false,
    requiereLabMX: false,
    daiRate: 0.20,
    tipoBulto: 'CAJA',
    instrucciones: ['TEMPERATURA: 12-14°C', 'EVITAR TEMPERATURAS BAJAS', 'NO REFRIGERAR'],
  },
  '0901110000': {
    nombre: 'CAFÉ SIN TOSTAR',
    nombreBotanico: 'Coffea arabica',
    requiereRefrigeracion: false,
    requiereLabMX: false,
    daiRate: 0.10,
    tipoBulto: 'SACO',
    instrucciones: ['LUGAR SECO', 'EVITAR OLORES FUERTES', 'HUMEDAD RELATIVA: <60%'],
  },
  '1701991000': {
    nombre: 'AZÚCAR MORENA / MASCABADO',
    requiereRefrigeracion: false,
    requiereLabMX: false,
    daiRate: 0.20,
    tipoBulto: 'SACO',
    instrucciones: ['LUGAR SECO', 'EVITAR HUMEDAD'],
  },
  '2402200000': {
    nombre: 'CIGARRILLOS DE TABACO',
    requiereRefrigeracion: false,
    requiereLabMX: false,
    daiRate: 0.00,
    tipoBulto: 'CAJA',
    instrucciones: ['PERMISO ESPECIAL REQUERIDO', 'DECLARACIÓN ESPECIAL ADUANA'],
  },
  '8471300000': {
    nombre: 'COMPUTADORA PORTÁTIL',
    requiereRefrigeracion: false,
    requiereLabMX: false,
    daiRate: 0.00,
    tipoBulto: 'CAJA',
    instrucciones: ['FRÁGIL', 'ESTE LADO ARRIBA', 'EVITAR HUMEDAD Y CALOR'],
  },
  '0405100000': {
    nombre: 'MANTEQUILLA',
    requiereRefrigeracion: true,
    requiereLabMX: false,
    daiRate: 0.15,
    tipoBulto: 'CAJA',
    instrucciones: ['MANTENER REFRIGERADO', 'TEMPERATURA: 0-4°C'],
  },
  '0406000000': {
    nombre: 'QUESO',
    requiereRefrigeracion: true,
    requiereLabMX: false,
    daiRate: 0.15,
    tipoBulto: 'CAJA',
    instrucciones: ['MANTENER REFRIGERADO', 'TEMPERATURA: 4-8°C'],
  },
  '0302000000': {
    nombre: 'PESCADO FRESCO',
    requiereRefrigeracion: true,
    requiereLabMX: false,
    daiRate: 0.15,
    tipoBulto: 'CAJA',
    instrucciones: ['MANTENER REFRIGERADO', 'TEMPERATURA: 0-2°C', 'PERECEDERO'],
  },
  '2106909900': {
    nombre: 'PREPARACIONES ALIMENTICIAS',
    requiereRefrigeracion: false,
    requiereLabMX: false,
    daiRate: 0.15,
    tipoBulto: 'CAJA',
    instrucciones: ['LUGAR FRESCO Y SECO', 'VERIFICAR ETIQUETADO'],
  },
  '0709909000': {
    nombre: 'BRÓCOLI',
    nombreBotanico: 'Brassica oleracea var. italica',
    requiereRefrigeracion: true,
    requiereLabMX: false,
    daiRate: 0.15,
    tipoBulto: 'CAJA',
    instrucciones: ['MANTENER REFRIGERACIÓN', 'TEMPERATURA: 0-2°C'],
  },
  '0706909000': {
    nombre: 'REMOLACHA / BETABEL',
    nombreBotanico: 'Beta vulgaris',
    requiereRefrigeracion: true,
    requiereLabMX: false,
    daiRate: 0.15,
    tipoBulto: 'COSTAL',
    instrucciones: ['MANTENER REFRIGERACIÓN', 'TEMPERATURA: 0-4°C'],
  },
};

export function getHSInfo(fraccion: string): HSInfo | undefined {
  // Try exact match first, then 10-digit, then 8-digit
  const clean = fraccion.replace(/[^0-9]/g, '');
  return HS_MAP[clean] ?? HS_MAP[clean.slice(0, 10)] ?? HS_MAP[clean.slice(0, 8)] ?? undefined;
}

const GTQ_RATE_DEFAULT = 7.75;

export function calcularTributos(
  mercancias: Mercancia[],
  fleteUSD: number,
  incoterm: string,
  tipoCambio = GTQ_RATE_DEFAULT,
  seguroUSD = 0,
): TributeCalc {
  const totalFacturaUSD = mercancias.reduce((acc, m) => acc + (m.valorUSD ?? 0), 0);

  let cifUSD: number;
  switch (incoterm.toUpperCase()) {
    case 'DPU':
    case 'DAP':
    case 'DDP':
      cifUSD = totalFacturaUSD;
      break;
    case 'FOB':
      cifUSD = totalFacturaUSD + fleteUSD + seguroUSD;
      break;
    case 'EXW':
    case 'FCA':
      // EXW: total + flete MX + flete GT + seguro (approximation: double freight)
      cifUSD = totalFacturaUSD + fleteUSD * 1.2 + seguroUSD;
      break;
    default:
      cifUSD = totalFacturaUSD + fleteUSD + seguroUSD;
  }

  const cifGTQ = cifUSD * tipoCambio;

  const desglose = mercancias.map(m => {
    const info = getHSInfo(m.fraccion);
    const daiRate = info?.daiRate ?? 0.15;
    const proporcion = totalFacturaUSD > 0 ? (m.valorUSD ?? 0) / totalFacturaUSD : 1 / mercancias.length;
    const cifParteGTQ = cifGTQ * proporcion;
    return { fraccion: m.fraccion, daiRate, daiGTQ: cifParteGTQ * daiRate };
  });

  const daiGTQ = desglose.reduce((acc, d) => acc + d.daiGTQ, 0);
  const daiUSD = daiGTQ / tipoCambio;
  const ivaGTQ = (cifGTQ + daiGTQ) * 0.12;
  const totalTributosGTQ = daiGTQ + ivaGTQ;

  return { cifUSD, cifGTQ, daiUSD, daiGTQ, ivaGTQ, totalTributosGTQ, desglose };
}
