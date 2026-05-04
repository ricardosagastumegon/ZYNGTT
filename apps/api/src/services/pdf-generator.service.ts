import PDFDocument from 'pdfkit';
import { getHSInfo } from '../data/hs-map';

interface Mercancia {
  fraccion: string;
  nombre?: string;
  cantidadKG: number;
  cantidadBultos?: number;
  valorUSD?: number;
  tipoBulto?: string;
}

interface ExpedienteForPDF {
  id: string;
  cfdiFolio?: string;
  expNombre: string;
  expRFC: string;
  expDireccion?: string;
  expCURP?: string;
  impNombre: string;
  impNIT?: string;
  impDireccion?: string;
  mercancias: Mercancia[];
  pesoTotalKG: number;
  pilotoNombre?: string;
  pilotoLicencia?: string;
  cabezalPlaca?: string;
  furgonPlaca?: string;
  numEconomico?: string;
  aduanaSalidaMX?: string;
  aduanaEntradaGT?: string;
  fechaCruce?: Date | string | null;
  totalUSD?: number;
  fleteCosto?: number;
  transporteEmpresa?: string;
  transporteCAAT?: string;
  cartaPorteNum?: string;
  manifiestoNum?: string;
  packingListNum?: string;
}

const NAVY = '#0f2d5a';
const NAVY_LIGHT = '#1a4080';
const ACCENT = '#2563eb';
const LIGHT_BG = '#f0f4ff';
const BORDER = '#d1d9f0';
const WHITE = '#ffffff';
const DARK = '#111827';
const GRAY = '#6b7280';

function formatDate(d?: Date | string | null): string {
  if (!d) return '___________';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function drawHLine(doc: PDFKit.PDFDocument, y: number, x0 = 50, color = BORDER) {
  doc.moveTo(x0, y).lineTo(doc.page.width - 50, y).strokeColor(color).lineWidth(0.5).stroke();
}

function sectionTitle(doc: PDFKit.PDFDocument, text: string, y: number, color = NAVY) {
  doc.rect(50, y, doc.page.width - 100, 16).fill(color);
  doc.fillColor(WHITE).fontSize(8).font('Helvetica-Bold').text(text, 56, y + 4);
  doc.fillColor(DARK).font('Helvetica');
  return y + 18;
}

function field(doc: PDFKit.PDFDocument, label: string, value: string, x: number, y: number, w = 220) {
  doc.fontSize(6.5).font('Helvetica-Bold').fillColor(GRAY).text(label.toUpperCase(), x, y);
  doc.fontSize(8).font('Helvetica').fillColor(DARK).text(value || '—', x, y + 8, { width: w });
}

function twoCol(doc: PDFKit.PDFDocument, l1: string, v1: string, l2: string, v2: string, y: number) {
  field(doc, l1, v1, 50, y, 225);
  field(doc, l2, v2, 315, y, 225);
}

export async function generateCartaPorteMX(expediente: ExpedienteForPDF): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 0 });
    const chunks: Buffer[] = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const PW = doc.page.width;
    const PH = doc.page.height;

    // Left sidebar accent bar
    doc.rect(0, 0, 8, PH).fill(ACCENT);

    // Header band
    doc.rect(8, 0, PW - 8, 72).fill(NAVY);
    doc.fillColor(WHITE).fontSize(16).font('Helvetica-Bold')
      .text('MANIFIESTO DE CARGA TERRESTRE', 24, 14, { width: PW - 40 });
    doc.fontSize(9).font('Helvetica').fillColor('#93c5fd')
      .text('AXON LOGISTIC  |  Importación México → Guatemala  |  Transporte Terrestre', 24, 38);
    doc.fillColor('#dbeafe').fontSize(8)
      .text(`No. Manifiesto: ${expediente.manifiestoNum || 'POR ASIGNAR'}`, 24, 54)
      .text(`Fecha: ${formatDate(expediente.fechaCruce)}`, 280, 54)
      .text(`No. Factura: ${expediente.cfdiFolio || '—'}`, 420, 54);

    let y = 90;

    // ── EXPORTADOR ──────────────────────────────────────────────────────────
    y = sectionTitle(doc, 'REMITENTE / EXPORTADOR', y);
    y += 6;
    twoCol(doc, 'Razón Social', expediente.expNombre, 'RFC', expediente.expRFC, y);
    y += 26;
    field(doc, 'Domicilio', expediente.expDireccion || 'México', 50, y, 480);
    y += 26;
    twoCol(doc, 'País de Origen', 'México', 'Aduana de Salida', expediente.aduanaSalidaMX || 'ADUANA SUCHIATE II', y);
    y += 26;

    // ── CONSIGNATARIO ────────────────────────────────────────────────────────
    y = sectionTitle(doc, 'CONSIGNATARIO / IMPORTADOR', y);
    y += 6;
    twoCol(doc, 'Razón Social', expediente.impNombre, 'NIT Guatemala', expediente.impNIT || '—', y);
    y += 26;
    twoCol(doc, 'Dirección Destino', expediente.impDireccion || '—', 'Aduana de Entrada', expediente.aduanaEntradaGT || 'ADUANA TECUN UMAN II', y);
    y += 26;

    // ── TRANSPORTE ────────────────────────────────────────────────────────────
    y = sectionTitle(doc, 'DATOS DE TRANSPORTE', y);
    y += 6;
    twoCol(doc, 'Empresa Transportista', expediente.transporteEmpresa || '—', 'No. CAAT', expediente.transporteCAAT || '—', y);
    y += 26;
    twoCol(doc, 'Piloto', expediente.pilotoNombre || '—', 'No. Licencia', expediente.pilotoLicencia || '—', y);
    y += 26;
    field(doc, 'Placa Cabezal', expediente.cabezalPlaca || '—', 50, y, 130);
    field(doc, 'Placa Furgón / Caja', expediente.furgonPlaca || '—', 210, y, 130);
    field(doc, 'No. Económico', expediente.numEconomico || '—', 370, y, 130);
    y += 26;

    // ── MERCANCÍAS ────────────────────────────────────────────────────────────
    y = sectionTitle(doc, 'DESCRIPCIÓN DE MERCANCÍAS', y);
    y += 4;

    // Table header row
    const tc = [50, 60, 240, 320, 390, 460];
    doc.rect(50, y, PW - 100, 16).fill(LIGHT_BG);
    doc.fillColor(NAVY).fontSize(7).font('Helvetica-Bold');
    ['#', 'Descripción / Fracción Arancelaria', 'Bultos', 'Peso KG', 'Valor USD', 'Tipo'].forEach((h, i) =>
      doc.text(h, tc[i] + 2, y + 4));
    y += 18;

    expediente.mercancias.forEach((m, idx) => {
      const info = getHSInfo(m.fraccion);
      const nombre = m.nombre || info?.nombre || m.fraccion;
      const rowBg = idx % 2 === 0 ? WHITE : '#f8faff';
      doc.rect(50, y, PW - 100, 22).fill(rowBg);
      doc.fillColor(DARK).fontSize(7.5).font('Helvetica');
      doc.text(String(idx + 1), tc[0] + 2, y + 4, { width: 10 });
      doc.text(`${nombre}`, tc[1] + 2, y + 3, { width: 178 });
      doc.fontSize(6.5).fillColor(GRAY).text(m.fraccion, tc[1] + 2, y + 13, { width: 178 });
      doc.fontSize(7.5).fillColor(DARK);
      doc.text(String(m.cantidadBultos || '—'), tc[2] + 2, y + 7);
      doc.text(`${m.cantidadKG.toLocaleString()} kg`, tc[3] + 2, y + 7);
      doc.text(m.valorUSD ? `$${m.valorUSD.toLocaleString()}` : '—', tc[4] + 2, y + 7);
      doc.text(m.tipoBulto || '—', tc[5] + 2, y + 7);
      y += 24;
    });

    // Totals row
    doc.rect(50, y, PW - 100, 18).fill(LIGHT_BG);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(NAVY);
    doc.text('TOTALES', tc[1] + 2, y + 5);
    doc.text(`${expediente.pesoTotalKG.toLocaleString()} kg`, tc[3] + 2, y + 5);
    doc.text(expediente.totalUSD ? `$${expediente.totalUSD.toLocaleString()} USD` : '', tc[4] + 2, y + 5);
    y += 24;

    // Ruta + Carta Porte ref
    doc.rect(50, y, PW - 100, 18).fill('#e0e7ff');
    doc.fontSize(7.5).font('Helvetica').fillColor(NAVY_LIGHT)
      .text(`Ruta: Ciudad Hidalgo, Chiapas, MX  →  Tecún Umán, San Marcos, GT`, 54, y + 5)
      .text(`Carta Porte Ref.: ${expediente.cartaPorteNum || 'POR ASIGNAR'}`, 360, y + 5);
    y += 26;

    doc.fontSize(7).fillColor(GRAY)
      .text('Declaro bajo protesta de decir verdad que la información anotada es veraz y exacta.', 50, y, { width: PW - 100 });
    y += 22;

    // Signature boxes
    const sigW = 160;
    [[50, 'Firma y Sello del Exportador'], [230, 'Firma y Sello del Transportista'], [410, 'Receptor / Aduana']].forEach(([sx, label]) => {
      doc.rect(Number(sx), y, sigW, 45).stroke(BORDER);
      doc.fontSize(7).fillColor(GRAY).text(String(label), Number(sx) + 4, y + 35);
    });

    // Footer
    doc.rect(0, PH - 22, PW, 22).fill(NAVY);
    doc.fontSize(7).fillColor('#93c5fd').font('Helvetica')
      .text('AXON LOGISTIC  —  Documento generado digitalmente. Verificar datos antes de presentar a aduana.', 12, PH - 14, { width: PW - 20 });

    doc.end();
  });
}

export async function generateCartaPorteGT(expediente: ExpedienteForPDF): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 0 });
    const chunks: Buffer[] = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const PW = doc.page.width;
    const PH = doc.page.height;

    // Accent bar
    doc.rect(0, 0, 8, PH).fill(ACCENT);

    // Header
    doc.rect(8, 0, PW - 8, 72).fill(NAVY);
    doc.fillColor(WHITE).fontSize(16).font('Helvetica-Bold')
      .text('CARTA DE PORTE TERRESTRE', 24, 14, { width: PW - 40 });
    doc.fontSize(9).font('Helvetica').fillColor('#93c5fd')
      .text('AXON LOGISTIC  |  Guatemala  |  Transporte Internacional de Mercancías', 24, 38);
    doc.fillColor('#dbeafe').fontSize(8)
      .text(`No. Carta Porte: ${expediente.cartaPorteNum || 'POR ASIGNAR'}`, 24, 54)
      .text(`Fecha: ${formatDate(expediente.fechaCruce)}`, 280, 54)
      .text(`No. Factura: ${expediente.cfdiFolio || '—'}`, 420, 54);

    let y = 90;

    // ── CONTRATANTE DEL FLETE ─────────────────────────────────────────────────
    y = sectionTitle(doc, 'CONTRATANTE DEL FLETE / IMPORTADOR', y);
    y += 6;
    twoCol(doc, 'Razón Social', expediente.impNombre, 'NIT', expediente.impNIT || '—', y);
    y += 26;
    field(doc, 'Dirección', expediente.impDireccion || '—', 50, y, 480);
    y += 26;

    // ── REMITENTE ─────────────────────────────────────────────────────────────
    y = sectionTitle(doc, 'REMITENTE / EXPORTADOR', y);
    y += 6;
    twoCol(doc, 'Razón Social', expediente.expNombre, 'RFC', expediente.expRFC, y);
    y += 26;
    twoCol(doc, 'Domicilio', expediente.expDireccion || 'México', 'País', 'México', y);
    y += 26;

    // ── TRANSPORTISTA ─────────────────────────────────────────────────────────
    y = sectionTitle(doc, 'TRANSPORTISTA', y);
    y += 6;
    twoCol(doc, 'Empresa', expediente.transporteEmpresa || '—', 'CAAT', expediente.transporteCAAT || '—', y);
    y += 26;
    twoCol(doc, 'Piloto', expediente.pilotoNombre || '—', 'Licencia', expediente.pilotoLicencia || '—', y);
    y += 26;
    twoCol(doc, 'Placa Cabezal', expediente.cabezalPlaca || '—', 'Placa Furgón / Caja', expediente.furgonPlaca || '—', y);
    y += 26;

    // ── MERCANCÍAS ─────────────────────────────────────────────────────────────
    y = sectionTitle(doc, 'MERCANCÍAS TRANSPORTADAS', y);
    y += 4;

    const tc = [50, 60, 260, 330, 410, 475];
    doc.rect(50, y, PW - 100, 16).fill(LIGHT_BG);
    doc.fillColor(NAVY).fontSize(7).font('Helvetica-Bold');
    ['#', 'Descripción / Fracción', 'Bultos', 'Peso KG', 'Valor USD', 'Tipo'].forEach((h, i) =>
      doc.text(h, tc[i] + 2, y + 4));
    y += 18;

    expediente.mercancias.forEach((m, idx) => {
      const info = getHSInfo(m.fraccion);
      const nombre = m.nombre || info?.nombre || m.fraccion;
      doc.rect(50, y, PW - 100, 22).fill(idx % 2 === 0 ? WHITE : '#f8faff');
      doc.fillColor(DARK).fontSize(7.5).font('Helvetica');
      doc.text(String(idx + 1), tc[0] + 2, y + 4);
      doc.text(nombre, tc[1] + 2, y + 3, { width: 195 });
      doc.fontSize(6.5).fillColor(GRAY).text(m.fraccion, tc[1] + 2, y + 13, { width: 195 });
      doc.fontSize(7.5).fillColor(DARK);
      doc.text(String(m.cantidadBultos || '—'), tc[2] + 2, y + 7);
      doc.text(`${m.cantidadKG.toLocaleString()} kg`, tc[3] + 2, y + 7);
      doc.text(m.valorUSD ? `$${m.valorUSD.toLocaleString()}` : '—', tc[4] + 2, y + 7);
      doc.text(m.tipoBulto || '—', tc[5] + 2, y + 7);
      y += 24;
    });

    // Totals
    doc.rect(50, y, PW - 100, 18).fill(LIGHT_BG);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(NAVY);
    doc.text('TOTALES', tc[1] + 2, y + 5);
    doc.text(`${expediente.pesoTotalKG.toLocaleString()} kg`, tc[3] + 2, y + 5);
    y += 24;

    // Flete + ruta
    doc.rect(50, y, PW - 100, 18).fill('#e0e7ff');
    doc.fontSize(7.5).font('Helvetica').fillColor(NAVY_LIGHT)
      .text(`Costo de Flete: ${expediente.fleteCosto ? `$${expediente.fleteCosto.toLocaleString()} USD` : 'SEGÚN CONTRATO'}`, 54, y + 5)
      .text('Ruta: Frontera Tecún Umán II  →  Destino en Guatemala', 280, y + 5);
    y += 28;

    // Signature boxes
    const sigW = 160;
    [[50, 'Firma Importador / Consignatario'], [230, 'Firma Transportista'], [410, 'Agente Aduanero']].forEach(([sx, label]) => {
      doc.rect(Number(sx), y, sigW, 45).stroke(BORDER);
      doc.fontSize(7).fillColor(GRAY).text(String(label), Number(sx) + 4, y + 35);
    });

    // Footer
    doc.rect(0, PH - 22, PW, 22).fill(NAVY);
    doc.fontSize(7).fillColor('#93c5fd').font('Helvetica')
      .text('AXON LOGISTIC  —  Documento generado digitalmente. Verificar datos antes de presentar a aduana.', 12, PH - 14, { width: PW - 20 });

    doc.end();
  });
}

export async function generatePackingList(expediente: ExpedienteForPDF): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 0 });
    const chunks: Buffer[] = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const PW = doc.page.width;
    const PH = doc.page.height;

    // Accent bar
    doc.rect(0, 0, 8, PH).fill(ACCENT);

    // Header
    doc.rect(8, 0, PW - 8, 72).fill(NAVY);
    doc.fillColor(WHITE).fontSize(16).font('Helvetica-Bold')
      .text('PACKING LIST', 24, 14, { width: PW - 40 });
    doc.fontSize(9).font('Helvetica').fillColor('#93c5fd')
      .text('AXON LOGISTIC  |  Lista de Empaque  |  Importación México → Guatemala', 24, 38);
    doc.fillColor('#dbeafe').fontSize(8)
      .text(`PL No.: ${expediente.packingListNum || 'POR ASIGNAR'}`, 24, 54)
      .text(`Fecha: ${formatDate(expediente.fechaCruce)}`, 280, 54)
      .text(`No. Factura: ${expediente.cfdiFolio || '—'}`, 420, 54);

    let y = 90;

    // ── SHIPPER ────────────────────────────────────────────────────────────────
    y = sectionTitle(doc, 'SHIPPER / EXPORTADOR', y);
    y += 6;
    twoCol(doc, 'Razón Social', expediente.expNombre, 'RFC', expediente.expRFC, y);
    y += 26;
    field(doc, 'Domicilio', expediente.expDireccion || 'México', 50, y, 480);
    y += 26;
    twoCol(doc, 'Aduana de Salida', expediente.aduanaSalidaMX || 'ADUANA SUCHIATE II', 'País', 'México', y);
    y += 26;

    // ── CONSIGNEE ─────────────────────────────────────────────────────────────
    y = sectionTitle(doc, 'CONSIGNEE / IMPORTADOR', y);
    y += 6;
    twoCol(doc, 'Razón Social', expediente.impNombre, 'NIT Guatemala', expediente.impNIT || '—', y);
    y += 26;
    twoCol(doc, 'Dirección', expediente.impDireccion || '—', 'Aduana de Entrada', expediente.aduanaEntradaGT || 'ADUANA TECUN UMAN II', y);
    y += 26;

    // ── TABLA ─────────────────────────────────────────────────────────────────
    y = sectionTitle(doc, 'DESCRIPCIÓN DE MERCANCÍAS', y);
    y += 4;

    const tc = [50, 62, 170, 320, 390, 455, 510];
    doc.rect(50, y, PW - 100, 16).fill(LIGHT_BG);
    doc.fillColor(NAVY).fontSize(7).font('Helvetica-Bold');
    ['#', 'Fracción', 'Descripción', 'Bultos', 'Tipo Bulto', 'Peso KG', 'Valor USD'].forEach((h, i) =>
      doc.text(h, tc[i] + 2, y + 4));
    y += 18;

    let totalBultos = 0;
    expediente.mercancias.forEach((m, idx) => {
      const info = getHSInfo(m.fraccion);
      const nombre = m.nombre || info?.nombre || m.fraccion;
      const bultos = m.cantidadBultos || 1;
      totalBultos += bultos;
      doc.rect(50, y, PW - 100, 22).fill(idx % 2 === 0 ? WHITE : '#f8faff');
      doc.fillColor(DARK).fontSize(7.5).font('Helvetica');
      doc.text(String(idx + 1), tc[0] + 2, y + 7);
      doc.text(m.fraccion, tc[1] + 2, y + 7, { width: 106 });
      doc.text(nombre, tc[2] + 2, y + 3, { width: 147 });
      doc.text(String(bultos), tc[3] + 2, y + 7);
      doc.text(m.tipoBulto || info?.tipoBulto || '—', tc[4] + 2, y + 7, { width: 63 });
      doc.text(`${m.cantidadKG.toLocaleString()} kg`, tc[5] + 2, y + 7);
      doc.text(m.valorUSD ? `$${m.valorUSD.toLocaleString()}` : '—', tc[6] + 2, y + 7);
      y += 24;
    });

    // Totals
    doc.rect(50, y, PW - 100, 18).fill(LIGHT_BG);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(NAVY);
    doc.text('TOTALES', tc[2] + 2, y + 5);
    doc.text(String(totalBultos), tc[3] + 2, y + 5);
    doc.text(`${expediente.pesoTotalKG.toLocaleString()} kg`, tc[5] + 2, y + 5);
    y += 22;

    // Instrucciones especiales
    const instrucciones = new Set<string>();
    expediente.mercancias.forEach((m: Mercancia) => {
      getHSInfo(m.fraccion)?.instrucciones.forEach(i => instrucciones.add(i));
    });
    if (instrucciones.size > 0) {
      y += 6;
      y = sectionTitle(doc, 'INSTRUCCIONES ESPECIALES DE EMBARQUE', y, ACCENT);
      y += 6;
      doc.fontSize(7.5).font('Helvetica').fillColor(DARK);
      [...instrucciones].forEach(inst => {
        doc.text(`•  ${inst}`, 56, y, { width: PW - 120 });
        y += 13;
      });
    }

    // Footer
    doc.rect(0, PH - 22, PW, 22).fill(NAVY);
    doc.fontSize(7).fillColor('#93c5fd').font('Helvetica')
      .text('AXON LOGISTIC  —  Documento generado digitalmente. Verificar datos antes de presentar a aduana.', 12, PH - 14, { width: PW - 20 });

    doc.end();
  });
}
