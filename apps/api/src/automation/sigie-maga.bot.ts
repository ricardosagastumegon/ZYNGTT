import { Page } from 'playwright';
import { acquireBrowser, newPage, screenshot } from './browser-manager';
import { logger } from '../utils/logger';

const SIGIE_URL = 'https://sigie.maga.gob.gt';
const LOGIN_URL = `${SIGIE_URL}/Account/Login`;

export interface SIGIECreds { username: string; password: string; }

export interface ConstanciaData {
  impNIT: string;
  impNombre: string;
  expNombre: string;
  expRFC: string;
  producto: { descripcion: string; hsCode: string; cantidadKG: number; valorUSD: number; paisOrigen?: string };
  fitoMXNumero?: string;
  labUrl?: string;
  aduanaEntrada?: string;
  fechaEstimada?: Date;
}

export interface SIGIEResult {
  success: boolean;
  solicitudNumero?: string;
  status?: string;
  errorMessage?: string;
  screenshotBase64?: string;
}

export async function login(creds: SIGIECreds): Promise<Page> {
  const browser = await acquireBrowser();
  const { page } = await newPage(browser);

  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });

  await page.locator('input[name="UserName"], input[name="username"], input[type="text"]').first().fill(creds.username);
  await page.locator('input[name="Password"], input[name="password"], input[type="password"]').first().fill(creds.password);
  await page.locator('button[type="submit"], input[type="submit"]').first().click();

  await page.waitForURL(url => !url.href.includes('/Account/Login'), { timeout: 30000 });
  logger.info('SIGIE login successful');
  return page;
}

export async function crearConstancia(page: Page, data: ConstanciaData): Promise<SIGIEResult> {
  try {
    await page.goto(`${SIGIE_URL}/solicitudes/nueva`, { waitUntil: 'domcontentloaded' });

    // Select type — Constancia Fitosanitaria Importación Vegetal
    await page.evaluate(() => {
      const sel = document.querySelector<HTMLSelectElement>('select[name="tipoSolicitud"], #tipoSolicitud, select[id*="tipo"]');
      if (!sel) return;
      const opt = Array.from(sel.options).find(o => /constancia.*vegetal|fitosanitaria.*import|vegetal.*import/i.test(o.text));
      if (opt) { sel.value = opt.value; sel.dispatchEvent(new Event('change')); }
    });

    await page.waitForTimeout(800);

    // NIT importador
    const nitField = page.locator('input[name*="nit"], input[name*="NIT"], input[id*="nit"]').first();
    if (await nitField.count() > 0) {
      await nitField.fill(data.impNIT);
      await nitField.press('Tab');
      await page.waitForTimeout(1000);
    }

    const nombreImpField = page.locator('input[name*="nombreImportador"], input[name*="importador"]').first();
    if (await nombreImpField.count() > 0) await nombreImpField.fill(data.impNombre);

    // País origen → México
    await page.evaluate(() => {
      const sel = document.querySelector<HTMLSelectElement>('select[name*="pais"], select[name*="origen"]');
      if (!sel) return;
      const opt = Array.from(sel.options).find(o => /m[eé]xico|MX/i.test(o.text));
      if (opt) { sel.value = opt.value; sel.dispatchEvent(new Event('change')); }
    });

    // Producto
    const descField = page.locator('input[name*="descripcion"], textarea[name*="descripcion"], #descripcion').first();
    if (await descField.count() > 0) await descField.fill(data.producto.descripcion);

    const hsField = page.locator('input[name*="fraccion"], input[name*="HS"], #fraccionArancelaria').first();
    if (await hsField.count() > 0) await hsField.fill(data.producto.hsCode);

    const kgField = page.locator('input[name*="cantidad"], input[name*="peso"], #cantidad').first();
    if (await kgField.count() > 0) await kgField.fill(String(data.producto.cantidadKG));

    const valorField = page.locator('input[name*="valor"], input[name*="USD"]').first();
    if (await valorField.count() > 0) await valorField.fill(String(data.producto.valorUSD));

    // Aduana entrada
    if (data.aduanaEntrada) {
      await page.evaluate((aduana) => {
        const sel = document.querySelector<HTMLSelectElement>('select[name*="aduana"], select[name*="puesto"]');
        if (!sel) return;
        const opt = Array.from(sel.options).find(o => o.text.toLowerCase().includes(aduana.toLowerCase().split(' ')[0]));
        if (opt) { sel.value = opt.value; sel.dispatchEvent(new Event('change')); }
      }, data.aduanaEntrada);
    }

    // Fecha estimada ingreso
    if (data.fechaEstimada) {
      const dateStr = data.fechaEstimada.toISOString().split('T')[0];
      const dateField = page.locator('input[type="date"][name*="fecha"], input[name*="Fecha"]').first();
      if (await dateField.count() > 0) await dateField.fill(dateStr);
    }

    // Número fito MX
    if (data.fitoMXNumero) {
      const fitoField = page.locator('input[name*="fito"], input[name*="certificado"]').first();
      if (await fitoField.count() > 0) await fitoField.fill(data.fitoMXNumero);
    }

    // Submit
    await page.locator('button[type="submit"]:has-text("Enviar"), button:has-text("Guardar"), input[type="submit"]').first().click();
    await page.waitForTimeout(2500);

    const solicitudNumero = await extractSolicitudNumber(page);
    const ss = await screenshot(page, 'sigie-create');

    logger.info(`SIGIE constancia created: ${solicitudNumero}`);
    return { success: true, solicitudNumero, status: 'RECIBIDA', screenshotBase64: ss };
  } catch (err) {
    logger.error('SIGIE crearConstancia error', err);
    const ss = await screenshot(page, 'sigie-error');
    return { success: false, errorMessage: err instanceof Error ? err.message : String(err), screenshotBase64: ss };
  }
}

export async function consultarEstado(page: Page, numero: string): Promise<{ status: string; observaciones?: string }> {
  await page.goto(`${SIGIE_URL}/solicitudes/consulta`, { waitUntil: 'domcontentloaded' });

  const field = page.locator('input[name*="numero"], input[name*="solicitud"], #busqueda').first();
  if (await field.count() > 0) {
    await field.fill(numero);
    await page.locator('button[type="submit"], button:has-text("Buscar")').first().click();
    await page.waitForTimeout(1500);
  }

  const pageText = (await page.textContent('body')) ?? '';

  const statusPatterns: [RegExp, string][] = [
    [/aprobad[ao]/i, 'APROBADO'],
    [/rechazad[ao]/i, 'RECHAZADO'],
    [/en\s+revisi[oó]n/i, 'EN_REVISION'],
    [/liberado/i, 'LIBERADO'],
    [/recibid[ao]/i, 'RECIBIDA'],
  ];

  let status = 'EN_REVISION';
  for (const [pattern, label] of statusPatterns) {
    if (pattern.test(pageText)) { status = label; break; }
  }

  const obsEl = page.locator('.observaciones, .notas, [data-obs]').first();
  const observaciones = await obsEl.count() > 0 ? (await obsEl.textContent())?.trim() : undefined;

  return { status, observaciones };
}

export async function descargarPermiso(page: Page, numero: string): Promise<Buffer | null> {
  await page.goto(`${SIGIE_URL}/permisos/descargar?solicitud=${encodeURIComponent(numero)}`, { waitUntil: 'domcontentloaded' });

  const downloadLink = page.locator('a[href*=".pdf"], a:has-text("Descargar")').first();
  if (await downloadLink.count() === 0) return null;

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    downloadLink.click(),
  ]);

  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function extractSolicitudNumber(page: Page): Promise<string | undefined> {
  const patterns = [
    /N[°o]\.?\s*Solicitud[:\s]+([A-Z0-9\-/]{4,})/i,
    /Solicitud[:\s]+([A-Z]{2,4}-\d{4,})/i,
    /Constancia[:\s#]+([A-Z0-9\-/]+)/i,
    /Folio[:\s]+([A-Z0-9\-/]+)/i,
  ];

  const text = (await page.textContent('body')) ?? '';
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return m[1].trim();
  }

  const el = page.locator('.numero-solicitud, .folio, [data-folio], .alert-success strong').first();
  if (await el.count() > 0) return (await el.textContent())?.trim();

  return undefined;
}
