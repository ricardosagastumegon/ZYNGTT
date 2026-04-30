import { CFDIData, CFDIEmisor, CFDIReceptor, CFDIConcepto, CFDIMercancia, CFDIComercioExterior } from '../types/cfdi.types';

function getAttr(node: Element | null, attr: string): string {
  return node?.getAttribute(attr) ?? '';
}

function getAttrFloat(node: Element | null, attr: string): number {
  return parseFloat(node?.getAttribute(attr) ?? '0') || 0;
}

function findElement(doc: Document, ...tags: string[]): Element | null {
  for (const tag of tags) {
    const el = doc.querySelector(tag) ?? doc.getElementsByTagNameNS('*', tag.split(':').pop() ?? tag)[0];
    if (el) return el as Element;
  }
  return null;
}

function findAll(doc: Document | Element, tag: string): Element[] {
  const short = tag.split(':').pop() ?? tag;
  const byTag = Array.from(doc.getElementsByTagNameNS('*', short));
  return byTag as Element[];
}

export function parseCFDI(xmlString: string): CFDIData {
  // Node.js: usar DOMParser vía xmldom si está disponible, o regexp fallback
  let doc: Document;
  try {
    const { DOMParser } = require('@xmldom/xmldom');
    const parser = new DOMParser();
    doc = parser.parseFromString(xmlString, 'text/xml');
  } catch {
    return parseCFDIRegexp(xmlString);
  }

  const comprobante = doc.documentElement;
  const version = getAttr(comprobante, 'Version') || getAttr(comprobante, 'version') || '4.0';
  const folio = getAttr(comprobante, 'Folio');
  const serie = getAttr(comprobante, 'Serie');
  const fecha = getAttr(comprobante, 'Fecha');
  const subTotal = getAttrFloat(comprobante, 'SubTotal');
  const total = getAttrFloat(comprobante, 'Total');
  const moneda = getAttr(comprobante, 'Moneda') || 'MXN';
  const tipoCambio = getAttrFloat(comprobante, 'TipoCambio') || 1;
  const tipoDeComprobante = getAttr(comprobante, 'TipoDeComprobante') || 'I';

  // Emisor
  const emisorEl = findAll(doc, 'Emisor')[0] ?? findAll(doc, 'cfdi:Emisor')[0];
  const emisor: CFDIEmisor = {
    nombre: getAttr(emisorEl, 'Nombre'),
    rfc: getAttr(emisorEl, 'Rfc'),
    regimenFiscal: getAttr(emisorEl, 'RegimenFiscal'),
  };

  // Receptor
  const receptorEl = findAll(doc, 'Receptor')[0] ?? findAll(doc, 'cfdi:Receptor')[0];
  const receptor: CFDIReceptor = {
    nombre: getAttr(receptorEl, 'Nombre'),
    rfc: getAttr(receptorEl, 'Rfc'),
    domicilioFiscal: getAttr(receptorEl, 'DomicilioFiscalReceptor'),
    usoCFDI: getAttr(receptorEl, 'UsoCFDI'),
  };

  // Conceptos
  const conceptoEls = findAll(doc, 'Concepto');
  const conceptos: CFDIConcepto[] = conceptoEls.map(c => ({
    descripcion: getAttr(c, 'Descripcion'),
    cantidad: getAttrFloat(c, 'Cantidad'),
    claveUnidad: getAttr(c, 'ClaveUnidad'),
    claveProdServ: getAttr(c, 'ClaveProdServ'),
    valorUnitario: getAttrFloat(c, 'ValorUnitario'),
    importe: getAttrFloat(c, 'Importe'),
    noIdentificacion: getAttr(c, 'NoIdentificacion') || undefined,
  }));

  // Complemento ComercioExterior
  let comercioExterior: CFDIComercioExterior | undefined;
  const ceEl = findAll(doc, 'ComercioExterior')[0];
  if (ceEl) {
    const mercanciaEls = findAll(ceEl as unknown as Document, 'Mercancia');
    const mercancias: CFDIMercancia[] = mercanciaEls.map(m => ({
      noIdentificacion: getAttr(m, 'NoIdentificacion') || undefined,
      fraccionArancelaria: getAttr(m, 'FraccionArancelaria') || undefined,
      paisOrigenDestino: getAttr(m, 'PaisOrigenDestino') || undefined,
      descripcionIngles: getAttr(m, 'DescripcionIngles') || undefined,
      unidadAduana: getAttr(m, 'UnidadAduana') || undefined,
      cantidadAduana: getAttrFloat(m, 'CantidadAduana') || undefined,
      valorDolares: getAttrFloat(m, 'ValorDolares') || undefined,
      kilogramosNetos: getAttrFloat(m, 'KilogramosNetos') || undefined,
    }));
    // NumRegIdTrib lives inside cce20:Receptor, a child of ComercioExterior
    const ceReceptorEl = findAll(ceEl as unknown as Document, 'Receptor')[0];
    const numRegIdTrib = getAttr(ceReceptorEl, 'NumRegIdTrib') || undefined;
    comercioExterior = {
      version: getAttr(ceEl, 'Version'),
      tipoOperacion: getAttr(ceEl, 'TipoOperacion'),
      claveDePedimento: getAttr(ceEl, 'ClaveDePedimento'),
      tipoCambioUSD: getAttrFloat(ceEl, 'TipoCambioUSD') || undefined,
      totalUSD: getAttrFloat(ceEl, 'TotalUSD') || undefined,
      numRegIdTrib,
      mercancias,
    };
  }

  // Detectar HS code
  const hsCodeDetected =
    comercioExterior?.mercancias?.[0]?.fraccionArancelaria?.slice(0, 4) ??
    inferHSFromClaveProdServ(conceptos[0]?.claveProdServ);

  const totalUSD = moneda === 'USD' ? total : total / (tipoCambio || 17.5);

  return {
    version, folio, serie, fecha, subTotal, total, moneda, tipoCambio,
    tipoDeComprobante, emisor, receptor, conceptos, comercioExterior,
    hsCodeDetected, totalUSD,
  };
}

function parseCFDIRegexp(xml: string): CFDIData {
  const attr = (tag: string, name: string) => {
    const m = xml.match(new RegExp(`<[^>]*:?${tag}[^>]*${name}="([^"]*)"`, 'i'));
    return m?.[1] ?? '';
  };

  return {
    version: attr('Comprobante', 'Version') || '4.0',
    folio: attr('Comprobante', 'Folio') || undefined,
    serie: attr('Comprobante', 'Serie') || undefined,
    fecha: attr('Comprobante', 'Fecha'),
    subTotal: parseFloat(attr('Comprobante', 'SubTotal')) || 0,
    total: parseFloat(attr('Comprobante', 'Total')) || 0,
    moneda: attr('Comprobante', 'Moneda') || 'MXN',
    tipoCambio: parseFloat(attr('Comprobante', 'TipoCambio')) || undefined,
    tipoDeComprobante: attr('Comprobante', 'TipoDeComprobante') || 'I',
    emisor: {
      nombre: attr('Emisor', 'Nombre'),
      rfc: attr('Emisor', 'Rfc'),
      regimenFiscal: attr('Emisor', 'RegimenFiscal'),
    },
    receptor: {
      nombre: attr('Receptor', 'Nombre'),
      rfc: attr('Receptor', 'Rfc'),
    },
    conceptos: [],
    hsCodeDetected: attr('Mercancia', 'FraccionArancelaria').slice(0, 4) || undefined,
  };
}

function inferHSFromClaveProdServ(clave?: string): string | undefined {
  if (!clave) return undefined;
  // SAT product keys that map to common food HS chapters
  const mapping: Record<string, string> = {
    '50111500': '0701', '50111600': '0702', '50111700': '0706',
    '50131600': '0201', '50131700': '0203', '50141500': '0401',
    '50161500': '1001', '50161600': '1005', '50161700': '1006',
    '50181500': '1601', '50201700': '2106',
  };
  for (const [prefix, hs] of Object.entries(mapping)) {
    if (clave.startsWith(prefix.slice(0, 6))) return hs;
  }
  return undefined;
}
