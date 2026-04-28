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
  expNombre: string;
  expRFC: string;
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

function formatDate(d?: Date | string | null): string {
  if (!d) return '___________';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function drawHLine(doc: PDFKit.PDFDocument, y: number, margin = 50) {
  doc.moveTo(margin, y).lineTo(doc.page.width - margin, y).strokeColor('#cccccc').lineWidth(0.5).stroke();
}

function sectionTitle(doc: PDFKit.PDFDocument, text: string, y: number) {
  doc.rect(50, y, doc.page.width - 100, 18).fill('#1e1b4b');
  doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold').text(text, 54, y + 4);
  doc.fillColor('#000000').font('Helvetica');
  return y + 20;
}

function field(doc: PDFKit.PDFDocument, label: string, value: string, x: number, y: number, w = 230) {
  doc.fontSize(7).font('Helvetica-Bold').fillColor('#555555').text(label, x, y);
  doc.fontSize(8).font('Helvetica').fillColor('#000000').text(value || '—', x, y + 9, { width: w });
}

export async function generateCartaPorteMX(expediente: ExpedienteForPDF): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width - 100;
    let y = 50;

    // Header
    doc.rect(50, y, W, 40).fill('#1e1b4b');
    doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold')
      .text('MANIFIESTO DE CARGA TERRESTRE', 50, y + 6, { width: W, align: 'center' });
    doc.fontSize(9).font('Helvetica').fillColor('#c7d2fe')
      .text('AXON LOGISTIC — Ciudad Hidalgo, Chiapas, México', 50, y + 24, { width: W, align: 'center' });
    doc.fillColor('#000000');
    y += 54;

    // Doc reference
    doc.fontSize(9).font('Helvetica').fillColor('#555555')
      .text(`Manifiesto No.: ${expediente.manifiestoNum || 'POR ASIGNAR'}`, 50, y)
      .text(`Fecha: ${formatDate(expediente.fechaCruce)}`, 300, y);
    y += 20;
    drawHLine(doc, y); y += 10;

    // Parties
    y = sectionTitle(doc, 'REMITENTE (EXPORTADOR)', y);
    y += 4;
    field(doc, 'Nombre / Razón Social', expediente.expNombre, 50, y);
    field(doc, 'RFC', expediente.expRFC, 310, y);
    y += 28;
    field(doc, 'País de Origen', 'México', 50, y);
    field(doc, 'Aduana de Salida', expediente.aduanaSalidaMX || 'ADUANA SUCHIATE II', 310, y);
    y += 30;

    y = sectionTitle(doc, 'CONSIGNATARIO (IMPORTADOR)', y);
    y += 4;
    field(doc, 'Nombre / Razón Social', expediente.impNombre, 50, y);
    field(doc, 'NIT Guatemala', expediente.impNIT || '', 310, y);
    y += 28;
    field(doc, 'Dirección Destino', expediente.impDireccion || '', 50, y);
    field(doc, 'Aduana de Entrada', expediente.aduanaEntradaGT || 'ADUANA TECUN UMAN II', 310, y);
    y += 30;

    y = sectionTitle(doc, 'DATOS DE TRANSPORTE', y);
    y += 4;
    field(doc, 'Empresa Transportista', expediente.transporteEmpresa || '', 50, y);
    field(doc, 'No. CAAT', expediente.transporteCAAT || '', 310, y);
    y += 24;
    field(doc, 'Piloto', expediente.pilotoNombre || '', 50, y);
    field(doc, 'No. Licencia', expediente.pilotoLicencia || '', 310, y);
    y += 24;
    field(doc, 'Placa Cabezal', expediente.cabezalPlaca || '', 50, y);
    field(doc, 'Placa Furgón', expediente.furgonPlaca || '', 200, y);
    field(doc, 'No. Económico', expediente.numEconomico || '', 350, y);
    y += 30;

    // Merchandise table
    y = sectionTitle(doc, 'MERCANCÍAS', y);
    y += 4;

    // Table header
    const cols = [50, 120, 310, 390, 470];
    const headers = ['No.', 'Descripción / Fracción', 'Bultos', 'Peso KG', 'Valor USD'];
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#333333');
    headers.forEach((h, i) => doc.text(h, cols[i], y));
    y += 12;
    drawHLine(doc, y); y += 4;

    const mercs = expediente.mercancias as Mercancia[];
    mercs.forEach((m, idx) => {
      const info = getHSInfo(m.fraccion);
      const nombre = m.nombre || info?.nombre || m.fraccion;
      doc.fontSize(7).font('Helvetica').fillColor('#000000');
      doc.text(String(idx + 1), cols[0], y);
      doc.text(`${nombre}\n${m.fraccion}`, cols[1], y, { width: 180 });
      doc.text(String(m.cantidadBultos || '—'), cols[2], y);
      doc.text(`${m.cantidadKG.toLocaleString()} KG`, cols[3], y);
      doc.text(m.valorUSD ? `$${m.valorUSD.toLocaleString()}` : '—', cols[4], y);
      y += 22;
      drawHLine(doc, y); y += 4;
    });

    // Totals
    doc.fontSize(8).font('Helvetica-Bold')
      .text('TOTAL', cols[1], y)
      .text(`${expediente.pesoTotalKG.toLocaleString()} KG`, cols[3], y)
      .text(expediente.totalUSD ? `$${expediente.totalUSD.toLocaleString()} USD` : '', cols[4], y);
    y += 24;

    drawHLine(doc, y); y += 10;
    doc.fontSize(7).fillColor('#555555').font('Helvetica')
      .text('Ruta: Ciudad Hidalgo, Chiapas, MX → Tecún Umán, San Marcos, GT', 50, y)
      .text(`Carta Porte No.: ${expediente.cartaPorteNum || 'POR ASIGNAR'}`, 310, y);
    y += 16;
    doc.text('Declaro bajo protesta de decir verdad que los datos anotados son verídicos y exactos.', 50, y, { width: W });
    y += 30;

    // Signatures
    const sigY = y;
    drawHLine(doc, sigY + 20, 50); drawHLine(doc, sigY + 20, 310);
    doc.text('Firma y Sello del Exportador', 50, sigY + 24);
    doc.text('Firma y Sello del Transportista', 310, sigY + 24);

    doc.end();
  });
}

export async function generateCartaPorteGT(expediente: ExpedienteForPDF): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width - 100;
    let y = 50;

    doc.rect(50, y, W, 40).fill('#0c4a6e');
    doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold')
      .text('CARTA DE PORTE TERRESTRE', 50, y + 6, { width: W, align: 'center' });
    doc.fontSize(9).font('Helvetica').fillColor('#bae6fd')
      .text('AXON LOGISTIC — Ciudad de Guatemala, Guatemala', 50, y + 24, { width: W, align: 'center' });
    y += 54;

    doc.fontSize(9).fillColor('#555555').font('Helvetica')
      .text(`Carta Porte No.: ${expediente.cartaPorteNum || 'POR ASIGNAR'}`, 50, y)
      .text(`Fecha: ${formatDate(expediente.fechaCruce)}`, 350, y);
    y += 20;
    drawHLine(doc, y); y += 10;

    y = sectionTitle(doc, 'CONTRATANTE DEL FLETE', y); y += 4;
    field(doc, 'Importador', expediente.impNombre, 50, y);
    field(doc, 'NIT', expediente.impNIT || '', 310, y);
    y += 28;
    field(doc, 'Exportador (Remitente)', expediente.expNombre, 50, y);
    y += 30;

    y = sectionTitle(doc, 'TRANSPORTISTA', y); y += 4;
    field(doc, 'Empresa', expediente.transporteEmpresa || '', 50, y);
    field(doc, 'CAAT', expediente.transporteCAAT || '', 310, y);
    y += 24;
    field(doc, 'Piloto', expediente.pilotoNombre || '', 50, y);
    field(doc, 'Licencia', expediente.pilotoLicencia || '', 310, y);
    y += 24;
    field(doc, 'Placa Cabezal', expediente.cabezalPlaca || '', 50, y);
    field(doc, 'Placa Furgón', expediente.furgonPlaca || '', 310, y);
    y += 30;

    y = sectionTitle(doc, 'MERCANCÍAS TRANSPORTADAS', y); y += 4;
    const cols = [50, 120, 310, 390, 470];
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#333333');
    ['No.', 'Descripción', 'Bultos', 'Peso KG', 'Valor USD'].forEach((h, i) => doc.text(h, cols[i], y));
    y += 12;
    drawHLine(doc, y); y += 4;

    expediente.mercancias.forEach((m: Mercancia, idx: number) => {
      const info = getHSInfo(m.fraccion);
      const nombre = m.nombre || info?.nombre || m.fraccion;
      doc.fontSize(7).font('Helvetica').fillColor('#000000');
      doc.text(String(idx + 1), cols[0], y);
      doc.text(nombre, cols[1], y, { width: 180 });
      doc.text(String(m.cantidadBultos || '—'), cols[2], y);
      doc.text(`${m.cantidadKG.toLocaleString()} KG`, cols[3], y);
      doc.text(m.valorUSD ? `$${m.valorUSD.toLocaleString()}` : '—', cols[4], y);
      y += 20;
      drawHLine(doc, y); y += 4;
    });

    doc.fontSize(8).font('Helvetica-Bold')
      .text('TOTAL FLETE:', 50, y)
      .text(expediente.fleteCosto ? `$${expediente.fleteCosto.toLocaleString()} USD` : 'SEGÚN CONTRATO', 200, y);
    y += 28;

    doc.fontSize(7).fillColor('#555555').font('Helvetica')
      .text('Ruta contratada: Frontera Tecún Umán II → Destino en Guatemala', 50, y, { width: W });
    y += 30;

    drawHLine(doc, y + 20, 50); drawHLine(doc, y + 20, 310);
    doc.text('Firma Importador / Consignatario', 50, y + 24);
    doc.text('Firma Transportista', 310, y + 24);

    doc.end();
  });
}

export async function generatePackingList(expediente: ExpedienteForPDF): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width - 100;
    let y = 50;

    doc.rect(50, y, W, 40).fill('#4f46e5');
    doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold')
      .text('PACKING LIST', 50, y + 6, { width: W, align: 'center' });
    doc.fontSize(9).font('Helvetica').fillColor('#c7d2fe')
      .text('AXON LOGISTIC — Logística Digital Centroamérica', 50, y + 24, { width: W, align: 'center' });
    y += 54;

    doc.fontSize(9).fillColor('#555555').font('Helvetica')
      .text(`Ship No.: ${expediente.packingListNum || 'POR ASIGNAR'}`, 50, y)
      .text(`Ship Date: ${formatDate(expediente.fechaCruce)}`, 350, y);
    y += 20;
    drawHLine(doc, y); y += 10;

    y = sectionTitle(doc, 'SHIPPER (EXPORTADOR)', y); y += 4;
    field(doc, 'Nombre', expediente.expNombre, 50, y);
    field(doc, 'RFC', expediente.expRFC, 310, y);
    y += 30;

    y = sectionTitle(doc, 'CONSIGNEE (IMPORTADOR)', y); y += 4;
    field(doc, 'Nombre', expediente.impNombre, 50, y);
    field(doc, 'NIT', expediente.impNIT || '', 310, y);
    y += 24;
    field(doc, 'Dirección', expediente.impDireccion || '', 50, y, 400);
    y += 30;

    const cols = [50, 100, 270, 360, 440, 510];
    y = sectionTitle(doc, 'DESCRIPCIÓN DE MERCANCÍAS', y); y += 4;
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#333333');
    ['No.', 'Fracción', 'Descripción', 'Bultos', 'Peso KG', 'Tipo Bulto'].forEach((h, i) =>
      doc.text(h, cols[i], y));
    y += 12;
    drawHLine(doc, y); y += 4;

    let totalBultos = 0;
    expediente.mercancias.forEach((m: Mercancia, idx: number) => {
      const info = getHSInfo(m.fraccion);
      const nombre = m.nombre || info?.nombre || m.fraccion;
      const bultos = m.cantidadBultos || 1;
      totalBultos += bultos;
      doc.fontSize(7).font('Helvetica').fillColor('#000000');
      doc.text(String(idx + 1), cols[0], y);
      doc.text(m.fraccion, cols[1], y);
      doc.text(nombre, cols[2], y, { width: 80 });
      doc.text(String(bultos), cols[3], y);
      doc.text(`${m.cantidadKG.toLocaleString()} KG`, cols[4], y);
      doc.text(m.tipoBulto || info?.tipoBulto || '—', cols[5], y);
      y += 20;
      drawHLine(doc, y); y += 4;
    });

    doc.fontSize(8).font('Helvetica-Bold')
      .text('TOTALES:', cols[1], y)
      .text(String(totalBultos), cols[3], y)
      .text(`${expediente.pesoTotalKG.toLocaleString()} KG`, cols[4], y);
    y += 24;

    field(doc, 'Ship From', `${expediente.aduanaSalidaMX || 'ADUANA SUCHIATE II'}, México`, 50, y);
    field(doc, 'Ship To', `${expediente.aduanaEntradaGT || 'ADUANA TECUN UMAN II'}, Guatemala`, 310, y);
    y += 24;

    // Shipping instructions from HS map
    const instrucciones = new Set<string>();
    expediente.mercancias.forEach((m: Mercancia) => {
      getHSInfo(m.fraccion)?.instrucciones.forEach(i => instrucciones.add(i));
    });
    if (instrucciones.size > 0) {
      y = sectionTitle(doc, 'INSTRUCCIONES DE EMBARQUE', y); y += 4;
      doc.fontSize(7).font('Helvetica').fillColor('#000000');
      [...instrucciones].forEach(inst => {
        doc.text(`• ${inst}`, 54, y);
        y += 12;
      });
      y += 6;
    }

    drawHLine(doc, y); y += 12;
    doc.fontSize(7).fillColor('#777777')
      .text('Documento generado automáticamente por AXON LOGISTIC. Verificar datos antes de presentar a aduana.', 50, y, { width: W, align: 'center' });

    doc.end();
  });
}
