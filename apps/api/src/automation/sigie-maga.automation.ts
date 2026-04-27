import { chromium, Browser, Page } from 'playwright';

const SIGIE_URL = 'https://sigie.maga.gob.gt';
const TIMEOUT = 30_000;

export interface SIGIECredentials {
  username: string;
  password: string;
}

export interface SIGIEFormData {
  tipoSolicitud: string;
  importador: {
    nit: string;
    nombre: string;
    rfcExportador: string;
    nombreExportador: string;
  };
  producto: {
    descripcion: string;
    hsCode: string;
    pais: string;
    cantidadKg: number;
    valorUSD: number;
  };
  ingresoAduana: string;
  fechaEstimadaIngreso: Date | undefined;
}

export interface SIGIEResult {
  success: boolean;
  requestNumber?: string;
  errorMessage?: string;
  screenshotBase64?: string;
}

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browserInstance;
}

export async function loginSIGIE(credentials: SIGIECredentials): Promise<Page> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    locale: 'es-GT',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(TIMEOUT);

  await page.goto(`${SIGIE_URL}/login`, { waitUntil: 'networkidle' });

  await page.fill('input[name="username"], input[id="username"], input[type="text"]', credentials.username);
  await page.fill('input[name="password"], input[id="password"], input[type="password"]', credentials.password);
  await page.click('button[type="submit"], input[type="submit"]');

  await page.waitForURL(url => !url.href.includes('/login'), { timeout: TIMEOUT });

  return page;
}

export async function createConstanciaVegetal(
  page: Page,
  formData: SIGIEFormData,
): Promise<SIGIEResult> {
  try {
    // Navigate to create new request
    await page.goto(`${SIGIE_URL}/solicitudes/nueva`, { waitUntil: 'networkidle' });

    // Select request type — Constancia Fitosanitaria de Importación
    const tipoSelect = page.locator('select[name="tipoSolicitud"], #tipoSolicitud');
    if (await tipoSelect.count() > 0) {
      await tipoSelect.selectOption({ label: /Constancia.*Vegetal|Fitosanitaria.*Importaci/i });
    }

    // NIT importador
    const nitField = page.locator('input[name="nitImportador"], input[name="nit"], #nit');
    if (await nitField.count() > 0) {
      await nitField.fill(formData.importador.nit);
      // Trigger lookup
      await nitField.press('Tab');
      await page.waitForTimeout(1000);
    }

    // Nombre importador
    const nombreField = page.locator('input[name="nombreImportador"], input[name="nombre"]');
    if (await nombreField.count() > 0) {
      await nombreField.fill(formData.importador.nombre);
    }

    // País origen (Mexico = MX)
    const paisSelect = page.locator('select[name="paisOrigen"], select[name="pais"]');
    if (await paisSelect.count() > 0) {
      await paisSelect.selectOption({ value: 'MX' }).catch(() =>
        paisSelect.selectOption({ label: /México|Mexico/i }),
      );
    }

    // Producto — descripción
    const descField = page.locator('input[name="descripcionProducto"], textarea[name="descripcion"], #descripcion');
    if (await descField.count() > 0) {
      await descField.fill(formData.producto.descripcion);
    }

    // HS / fracción arancelaria
    const hsField = page.locator('input[name="fraccionArancelaria"], input[name="hsCode"], #fraccionArancelaria');
    if (await hsField.count() > 0) {
      await hsField.fill(formData.producto.hsCode);
    }

    // Cantidad en KG
    const kgField = page.locator('input[name="cantidad"], input[name="pesoKg"], #cantidad');
    if (await kgField.count() > 0) {
      await kgField.fill(String(formData.producto.cantidadKg));
    }

    // Valor USD
    const valorField = page.locator('input[name="valorUSD"], input[name="valor"]');
    if (await valorField.count() > 0) {
      await valorField.fill(String(formData.producto.valorUSD));
    }

    // Aduana de ingreso
    const aduanaSelect = page.locator('select[name="aduana"], select[name="puertoIngreso"]');
    if (await aduanaSelect.count() > 0) {
      await aduanaSelect.selectOption({ label: new RegExp(formData.ingresoAduana.split(' ')[0], 'i') }).catch(() => {});
    }

    // Fecha estimada de ingreso
    if (formData.fechaEstimadaIngreso) {
      const dateStr = formData.fechaEstimadaIngreso.toISOString().split('T')[0];
      const fechaField = page.locator('input[type="date"][name*="fecha"], input[name*="Fecha"]');
      if (await fechaField.count() > 0) {
        await fechaField.fill(dateStr);
      }
    }

    // Submit
    await page.click('button[type="submit"]:has-text("Enviar"), button:has-text("Guardar solicitud"), input[type="submit"]');
    await page.waitForTimeout(2000);

    // Extract request number
    const requestNumber = await extractRequestNumber(page);

    const screenshot = await page.screenshot({ encoding: 'base64' });

    return {
      success: true,
      requestNumber,
      screenshotBase64: screenshot as string,
    };
  } catch (err) {
    const screenshot = await page.screenshot({ encoding: 'base64' }).catch(() => undefined);
    return {
      success: false,
      errorMessage: err instanceof Error ? err.message : String(err),
      screenshotBase64: screenshot as string | undefined,
    };
  }
}

async function extractRequestNumber(page: Page): Promise<string | undefined> {
  // Try common patterns for request number display
  const patterns = [
    /N[°o]\.?\s*de\s*Solicitud[:\s]+([A-Z0-9\-/]+)/i,
    /Solicitud[:\s]+([A-Z]{2,4}-\d{4,})/i,
    /Constancia[:\s#]+([A-Z0-9\-/]+)/i,
    /Folio[:\s]+([A-Z0-9\-/]+)/i,
  ];

  const pageText = await page.textContent('body') ?? '';
  for (const pattern of patterns) {
    const match = pageText.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  // Try looking for a confirmation element
  const confirmEl = page.locator('.numero-solicitud, .folio, [data-folio], .alert-success strong');
  if (await confirmEl.count() > 0) {
    return (await confirmEl.first().textContent())?.trim();
  }

  return undefined;
}

export async function checkSIGIEStatus(
  page: Page,
  requestNumber: string,
): Promise<{ status: string; observations?: string }> {
  await page.goto(`${SIGIE_URL}/solicitudes/consulta`, { waitUntil: 'networkidle' });

  const searchField = page.locator('input[name="numeroSolicitud"], input[name="folio"], #busqueda');
  if (await searchField.count() > 0) {
    await searchField.fill(requestNumber);
    await page.click('button[type="submit"], button:has-text("Buscar")');
    await page.waitForTimeout(1500);
  }

  const pageText = await page.textContent('body') ?? '';

  const statusPatterns: Array<[RegExp, string]> = [
    [/aprobad[ao]/i, 'APPROVED'],
    [/rechazad[ao]/i, 'REJECTED'],
    [/en\s+revisi[oó]n/i, 'MAGA_REVIEW'],
    [/liberado/i, 'RELEASED'],
    [/pendiente/i, 'MAGA_REVIEW'],
  ];

  let status = 'UNKNOWN';
  for (const [pattern, label] of statusPatterns) {
    if (pattern.test(pageText)) { status = label; break; }
  }

  const obsEl = page.locator('.observaciones, .notas, [data-obs]');
  const observations = await obsEl.count() > 0
    ? (await obsEl.first().textContent() ?? undefined)
    : undefined;

  return { status, observations: observations?.trim() };
}

export async function generatePaymentSIGIE(page: Page, requestNumber: string): Promise<string | undefined> {
  await page.goto(`${SIGIE_URL}/pagos/generar?solicitud=${encodeURIComponent(requestNumber)}`, {
    waitUntil: 'networkidle',
  });

  const paymentLinkEl = page.locator('a[href*="pago"], a[href*="boleta"], a:has-text("Descargar boleta")');
  if (await paymentLinkEl.count() > 0) {
    return await paymentLinkEl.first().getAttribute('href') ?? undefined;
  }

  return undefined;
}

export async function closeSIGIEBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
