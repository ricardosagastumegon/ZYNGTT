import { Page } from 'playwright';
import { acquireBrowser, newPage, screenshot } from './browser-manager';
import { logger } from '../utils/logger';

// Agencia Virtual SAT Guatemala (Declaraguate migra junio 2026)
const SAT_URL = 'https://farm3.sat.gob.gt/menu/login.jsf';

export interface SATCreds { username: string; password: string; }

export interface DUCAData {
  expedienteId: string;
  impNombre: string;
  impNIT: string;
  expNombre: string;
  expPais: string;
  incoterm: string;
  fleteUSD: number;
  seguroUSD: number;
  cifUSD: number;
  mercancias: {
    fraccion: string;
    descripcion: string;
    paisOrigen: string;
    cantidadKG: number;
    valorCIF: number;
  }[];
  documentUrls: {
    facturaUrl?: string;
    packingListUrl?: string;
    cartaPorteUrl?: string;
    magaPermitUrl?: string;
    fitoMXUrl?: string;
    labUrl?: string;
  };
}

export interface SATResult {
  success: boolean;
  ducaNumero?: string;
  ordenSAT?: string;
  semaforo?: 'VERDE' | 'ROJO' | 'PENDIENTE';
  errorMessage?: string;
  screenshotBase64?: string;
}

export async function login(creds: SATCreds): Promise<Page> {
  const browser = await acquireBrowser();
  const { page } = await newPage(browser, 'es-GT');

  await page.goto(SAT_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  await page.locator('input[id*="user"], input[name*="user"], input[type="text"]').first().fill(creds.username);
  await page.locator('input[id*="pass"], input[name*="pass"], input[type="password"]').first().fill(creds.password);
  await page.locator('button[type="submit"], input[type="submit"], button:has-text("Ingresar")').first().click();

  await page.waitForURL(url => !url.href.includes('login'), { timeout: 30000 });
  logger.info('SAT login successful');
  return page;
}

export async function transmitirDUCAD(page: Page, data: DUCAData): Promise<SATResult> {
  try {
    // Navigate to new DUCA-D declaration
    await page.goto('https://farm3.sat.gob.gt/menu/declaracion.jsf', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Select regime — Importación definitiva
    await page.evaluate(() => {
      const sel = document.querySelector<HTMLSelectElement>('select[id*="regimen"], select[name*="regimen"]');
      if (!sel) return;
      const opt = Array.from(sel.options).find(o => /importaci[oó]n.*definitiva|D[- ]?1/i.test(o.text));
      if (opt) { sel.value = opt.value; sel.dispatchEvent(new Event('change')); }
    });
    await page.waitForTimeout(1000);

    // Importador NIT
    const nitField = page.locator('input[id*="nitImportador"], input[name*="importador"]').first();
    if (await nitField.count() > 0) { await nitField.fill(data.impNIT); await nitField.press('Tab'); await page.waitForTimeout(800); }

    // Exportador
    const expField = page.locator('input[id*="exportador"], input[name*="exportador"]').first();
    if (await expField.count() > 0) await expField.fill(data.expNombre);

    // Incoterm
    await page.evaluate((incoterm) => {
      const sel = document.querySelector<HTMLSelectElement>('select[id*="incoterm"], select[name*="incoterm"]');
      if (!sel) return;
      const opt = Array.from(sel.options).find(o => o.value === incoterm || o.text.includes(incoterm));
      if (opt) { sel.value = opt.value; sel.dispatchEvent(new Event('change')); }
    }, data.incoterm);

    // DVA — valor en aduana
    const fleteField = page.locator('input[id*="flete"], input[name*="flete"]').first();
    if (await fleteField.count() > 0) await fleteField.fill(String(data.fleteUSD));

    const seguroField = page.locator('input[id*="seguro"], input[name*="seguro"]').first();
    if (await seguroField.count() > 0) await seguroField.fill(String(data.seguroUSD));

    const cifField = page.locator('input[id*="cif"], input[id*="CIF"]').first();
    if (await cifField.count() > 0) await cifField.fill(String(data.cifUSD));

    // Mercancías
    for (let i = 0; i < data.mercancias.length; i++) {
      const m = data.mercancias[i];

      if (i > 0) {
        const addBtn = page.locator('button:has-text("Agregar"), button:has-text("+ Mercancía")').first();
        if (await addBtn.count() > 0) await addBtn.click();
        await page.waitForTimeout(500);
      }

      await page.evaluate(([fraccion, idx]: [string, number]) => {
        const inputs = document.querySelectorAll<HTMLInputElement>('input[name*="fraccion"], input[id*="fraccion"]');
        const inp = inputs[idx];
        if (inp) { inp.value = fraccion; inp.dispatchEvent(new Event('change')); }
      }, [m.fraccion, i] as [string, number]);

      const descInputs = await page.locator('input[name*="descripcion"], textarea[name*="descripcion"]').all();
      if (descInputs[i]) await descInputs[i].fill(m.descripcion);

      const kgInputs = await page.locator('input[name*="peso"], input[name*="cantidad"]').all();
      if (kgInputs[i]) await kgInputs[i].fill(String(m.cantidadKG));

      const valInputs = await page.locator('input[name*="valorCIF"], input[name*="valor"]').all();
      if (valInputs[i]) await valInputs[i].fill(String(m.valorCIF));
    }

    // Submit / Transmit
    const transmitBtn = page.locator('button:has-text("Transmitir"), button:has-text("Enviar declaración"), input[value*="Transmitir"]').first();
    if (await transmitBtn.count() > 0) {
      await transmitBtn.click();
      await page.waitForTimeout(4000);
    }

    const { ducaNumero, ordenSAT } = await extractDUCANumbers(page);
    const semaforo = await checkSemaforoOnPage(page);
    const ss = await screenshot(page, 'sat-transmit');

    logger.info(`SAT DUCA-D transmitida: ${ducaNumero}, orden: ${ordenSAT}`);
    return { success: true, ducaNumero, ordenSAT, semaforo, screenshotBase64: ss };
  } catch (err) {
    logger.error('SAT transmitirDUCAD error', err);
    const ss = await screenshot(page, 'sat-error');
    return { success: false, errorMessage: err instanceof Error ? err.message : String(err), screenshotBase64: ss };
  }
}

export async function consultarSemaforo(page: Page, ducaNumero: string): Promise<'VERDE' | 'ROJO' | 'PENDIENTE'> {
  await page.goto('https://farm3.sat.gob.gt/menu/consulta.jsf', { waitUntil: 'domcontentloaded' });

  const field = page.locator('input[id*="duca"], input[name*="numero"]').first();
  if (await field.count() > 0) {
    await field.fill(ducaNumero);
    await page.locator('button:has-text("Consultar"), button[type="submit"]').first().click();
    await page.waitForTimeout(2000);
  }

  return checkSemaforoOnPage(page);
}

export async function generarPago(page: Page, ordenSAT: string): Promise<{ referencia: string; monto: number } | null> {
  await page.goto(`https://farm3.sat.gob.gt/menu/pago.jsf?orden=${encodeURIComponent(ordenSAT)}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const text = (await page.textContent('body')) ?? '';
  const refMatch = text.match(/Referencia[:\s]+([A-Z0-9\-]+)/i);
  const montoMatch = text.match(/Monto[:\s]+Q?([\d,]+\.?\d*)/i);

  if (!refMatch) return null;

  return {
    referencia: refMatch[1].trim(),
    monto: montoMatch ? parseFloat(montoMatch[1].replace(',', '')) : 0,
  };
}

async function extractDUCANumbers(page: Page): Promise<{ ducaNumero?: string; ordenSAT?: string }> {
  const text = (await page.textContent('body')) ?? '';

  const ducaMatch = text.match(/DUCA[- ]?D?[:\s]+([A-Z0-9\-]{8,20})/i)
    ?? text.match(/Declaraci[oó]n[:\s]+([A-Z0-9\-]{10,20})/i);

  const ordenMatch = text.match(/Orden[:\s]+(\d{15})/i)
    ?? text.match(/(\d{15})/);

  return {
    ducaNumero: ducaMatch?.[1]?.trim(),
    ordenSAT: ordenMatch?.[1]?.trim(),
  };
}

async function checkSemaforoOnPage(page: Page): Promise<'VERDE' | 'ROJO' | 'PENDIENTE'> {
  const text = (await page.textContent('body')) ?? '';

  if (/verde|VERDE|liberado|LIBERADO/i.test(text)) return 'VERDE';
  if (/rojo|ROJO|observado|OBSERVADO|retenido/i.test(text)) return 'ROJO';

  // Check for colored elements
  const greenEl = await page.locator('.semaforo-verde, .verde, [class*="green"]').count();
  const redEl = await page.locator('.semaforo-rojo, .rojo, [class*="red"]').count();

  if (greenEl > 0) return 'VERDE';
  if (redEl > 0) return 'ROJO';

  return 'PENDIENTE';
}
