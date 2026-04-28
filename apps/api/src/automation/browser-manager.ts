import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { logger } from '../utils/logger';

const MAX_BROWSERS = 3;
const pool: Browser[] = [];

const HEADLESS = process.env.PLAYWRIGHT_HEADLESS !== 'false';
const TIMEOUT = parseInt(process.env.PLAYWRIGHT_TIMEOUT ?? '30000', 10);

async function launchBrowser(): Promise<Browser> {
  const browser = await chromium.launch({
    headless: HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  pool.push(browser);
  return browser;
}

export async function acquireBrowser(): Promise<Browser> {
  const alive = pool.filter(b => b.isConnected());
  pool.length = 0;
  pool.push(...alive);

  if (pool.length < MAX_BROWSERS) {
    return launchBrowser();
  }

  // Return existing browser with least contexts
  return pool.reduce((min, b) => (b.contexts().length < min.contexts().length ? b : min), pool[0]);
}

export async function newPage(browser: Browser, locale = 'es-GT'): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale,
    // Block images, fonts, analytics to speed up automation
    serviceWorkers: 'block',
  });

  await context.route('**/*.{png,jpg,jpeg,gif,svg,webp,woff,woff2,ttf,eot}', route => route.abort());
  await context.route('**/(analytics|gtm|hotjar|clarity|facebook|intercom)**.js', route => route.abort());

  const page = await context.newPage();
  page.setDefaultTimeout(TIMEOUT);
  return { context, page };
}

export async function screenshot(page: Page, label: string): Promise<string> {
  try {
    const buf = await page.screenshot({ fullPage: false });
    logger.debug(`Screenshot taken: ${label}`);
    return buf.toString('base64');
  } catch {
    return '';
  }
}

export async function closeAll(): Promise<void> {
  await Promise.allSettled(pool.map(b => b.close()));
  pool.length = 0;
  logger.info('All browsers closed');
}
