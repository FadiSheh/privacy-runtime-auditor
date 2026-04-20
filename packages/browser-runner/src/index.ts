import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { chromium, type BrowserContext, type Page } from 'playwright';

import type {
  ConsentAction,
  ConsentUiDetection,
  PageKind,
  PageScanResult,
  RuntimeArtifact,
  ScanConfig,
  ScenarioScanResult,
  ScenarioType,
} from '@pra/shared';
import { createId, normalizeUrl, sameHostname } from '@pra/utils';
import { classifyVendorByHost } from '@pra/vendor-registry';

const pageKindMatchers: Array<{ kind: PageKind; pattern: RegExp }> = [
  { kind: 'legal', pattern: /privacy|cookie|policy|terms/i },
  { kind: 'checkout', pattern: /checkout|cart|basket/i },
  { kind: 'product', pattern: /product|item/i },
  { kind: 'category', pattern: /category|shop|collection/i },
  { kind: 'about', pattern: /about/i },
  { kind: 'contact', pattern: /contact/i },
  { kind: 'article', pattern: /blog|article|news/i },
];

const actionMatchers: Array<{ action: ConsentAction; patterns: RegExp[] }> = [
  { action: 'accept-all', patterns: [/accept all/i, /allow all/i, /agree/i] },
  { action: 'reject-all', patterns: [/reject all/i, /deny all/i, /decline/i] },
  { action: 'open-preferences', patterns: [/manage/i, /preferences/i, /settings/i, /customize/i] },
  { action: 'save-preferences', patterns: [/save/i, /confirm choices/i, /apply/i] },
];

const scenarioSequence: ScenarioType[] = ['no-consent', 'accept-all', 'reject-all', 'granular'];

export interface BrowserScanOptions {
  rootUrl: string;
  config: ScanConfig;
  outputPath: string;
}

export interface BrowserScanResult {
  pages: PageScanResult[];
  homepageHtml: string;
}

export async function discoverPages(rootUrl: string, config: ScanConfig): Promise<Array<{ url: string; pageKind: PageKind }>> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(rootUrl, { waitUntil: 'domcontentloaded', timeout: config.scanTimeoutMs });
  await page.waitForTimeout(Math.min(config.preActionWaitMs, 3000));

  const hrefs = await page.locator('a[href]').evaluateAll((elements) =>
    elements
      .map((element) => ({
        href: element.getAttribute('href'),
        text: element.textContent ?? '',
      }))
      .filter((item) => Boolean(item.href)),
  );
  const unique = new Map<string, PageKind>();
  unique.set(normalizeUrl(rootUrl), 'homepage');

  for (const item of hrefs) {
    if (!item.href) {
      continue;
    }

    const candidateUrl = normalizeUrl(new URL(item.href, rootUrl).toString());
    if (!sameHostname(rootUrl, candidateUrl, config.allowedSubdomains)) {
      continue;
    }

    if (unique.has(candidateUrl)) {
      continue;
    }

    const pageKind = inferPageKind(candidateUrl, item.text);
    unique.set(candidateUrl, pageKind);

    if (unique.size >= config.maxPages) {
      break;
    }
  }

  await browser.close();
  return Array.from(unique.entries()).map(([url, pageKind]) => ({ url, pageKind }));
}

export async function fetchPageHtml(url: string): Promise<string> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const html = await page.content();
  await browser.close();
  return html;
}

export async function runBrowserScan(options: BrowserScanOptions): Promise<BrowserScanResult> {
  await mkdir(options.outputPath, { recursive: true });
  const discoveredPages = await discoverPages(options.rootUrl, options.config);
  const homepageHtml = await fetchPageHtml(options.rootUrl);
  const pages: PageScanResult[] = [];

  for (const pageInfo of discoveredPages) {
    const scenarioResults: ScenarioScanResult[] = [];

    for (const scenarioType of scenarioSequence) {
      scenarioResults.push(await runScenario(pageInfo.url, pageInfo.pageKind, scenarioType, options));
    }

    pages.push({
      url: pageInfo.url,
      normalizedUrl: normalizeUrl(pageInfo.url),
      pageKind: pageInfo.pageKind,
      scenarioResults,
    });
  }

  return {
    pages,
    homepageHtml,
  };
}

async function runScenario(url: string, pageKind: PageKind, scenarioType: ScenarioType, options: BrowserScanOptions): Promise<ScenarioScanResult> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const requests: RuntimeArtifact[] = [];
  const startedAt = Date.now();

  page.on('request', (request) => {
    const requestUrl = request.url();
    const classification = classifyUrl(requestUrl, options.rootUrl);
    requests.push({
      id: createId('artifact'),
      artifactType: 'request',
      name: request.resourceType(),
      domain: new URL(requestUrl).hostname,
      url: requestUrl,
      vendorId: classification.vendorId,
      vendorName: classification.vendorName,
      category: classification.category,
      firstParty: classification.firstParty,
      confidence: classification.confidence,
      timestampOffsetMs: Date.now() - startedAt,
      raw: {
        method: request.method(),
        resourceType: request.resourceType(),
      },
    });
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: options.config.scanTimeoutMs });
    await page.waitForTimeout(options.config.preActionWaitMs);

    let consent = await detectConsentUi(page);
    if (scenarioType !== 'no-consent') {
      consent = await executeScenarioAction(page, scenarioType, consent, options.config.postActionWaitMs);
    }

    const storageArtifacts = await collectStorageArtifacts(page, url, startedAt, options.rootUrl);
    const domArtifacts = await collectDomArtifacts(page, url, startedAt, options.rootUrl);
    const cookieArtifacts = await collectCookieArtifacts(context, startedAt, options.rootUrl);

    const screenshotPath = join(options.outputPath, `${sanitizeFilename(url)}-${scenarioType}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    return {
      scenarioType,
      status: 'completed',
      consent,
      artifacts: [...requests, ...cookieArtifacts, ...storageArtifacts, ...domArtifacts],
      screenshotPath,
      bannerScreenshotPath: null,
      domEvidence: [consent.htmlSnippet].filter(Boolean),
      errorMessage: null,
      metadata: {
        pageKind,
        finalUrl: page.url(),
        title: await page.title(),
      },
    };
  } catch (error) {
    return {
      scenarioType,
      status: 'failed',
      consent: emptyConsentUi(),
      artifacts: requests,
      screenshotPath: null,
      bannerScreenshotPath: null,
      domEvidence: [],
      errorMessage: error instanceof Error ? error.message : 'Unknown scan failure',
      metadata: {
        pageKind,
      },
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

async function detectConsentUi(page: Page): Promise<ConsentUiDetection> {
  const buttons = await page.locator('button, [role="button"], a').evaluateAll((elements) =>
    elements
      .map((element) => {
        const text = (element.textContent ?? '').trim();
        if (!text) {
          return null;
        }
        return {
          label: text,
          selector: buildSelector(element),
        };
      })
      .filter((button): button is { label: string; selector: string } => Boolean(button)),
  );

  const matchedButtons = buttons
    .map((button) => {
      const action = inferAction(button.label);
      if (!action) {
        return null;
      }
      return {
        label: button.label,
        selector: button.selector,
        action,
      };
    })
    .filter((button): button is { label: string; selector: string; action: ConsentAction } => Boolean(button));

  const bodyText = (await page.locator('body').innerText()).slice(0, 1000);
  const bannerText = bodyText
    .split(/\n+/)
    .find((line) => /cookie|privacy|consent|preferences/i.test(line))
    ?.trim() ?? '';

  const htmlSnippet = await page.locator('body').evaluate((element) => element.innerHTML.slice(0, 2000));
  const rejectVisible = matchedButtons.some((button) => button.action === 'reject-all');
  const granularControlsPresent = matchedButtons.some((button) => button.action === 'open-preferences' || button.action === 'save-preferences');

  return {
    present: matchedButtons.length > 0 || /cookie|consent|privacy/i.test(bannerText),
    cmpVendor: inferCmpVendor(htmlSnippet),
    rejectVisible,
    granularControlsPresent,
    bannerText,
    htmlSnippet,
    buttons: matchedButtons,
    limitations: [],
  };
}

async function executeScenarioAction(page: Page, scenarioType: ScenarioType, consent: ConsentUiDetection, postActionWaitMs: number) {
  const next = { ...consent, limitations: [...consent.limitations] };
  const clickAction = async (action: ConsentAction) => {
    const button = next.buttons.find((entry) => entry.action === action);
    if (!button) {
      next.limitations.push(`Action ${action} was not available.`);
      return false;
    }

    try {
      await page.locator(button.selector).first().click({ timeout: 3000 });
      await page.waitForTimeout(postActionWaitMs);
      return true;
    } catch {
      next.limitations.push(`Action ${action} could not be executed.`);
      return false;
    }
  };

  if (scenarioType === 'accept-all') {
    await clickAction('accept-all');
  }

  if (scenarioType === 'reject-all') {
    await clickAction('reject-all');
  }

  if (scenarioType === 'granular') {
    const opened = await clickAction('open-preferences');
    if (!opened) {
      next.limitations.push('Granular preferences were not automatable.');
      return next;
    }

    const checkboxes = page.locator('input[type="checkbox"], [role="checkbox"]');
    const checkboxCount = await checkboxes.count();
    for (let index = 0; index < checkboxCount; index += 1) {
      const checkbox = checkboxes.nth(index);
      const checked = await checkbox.isChecked().catch(() => false);
      if (checked) {
        await checkbox.click().catch(() => undefined);
      }
    }
    await clickAction('save-preferences');
  }

  return detectConsentUi(page);
}

async function collectCookieArtifacts(context: BrowserContext, startedAt: number, rootUrl: string): Promise<RuntimeArtifact[]> {
  const rootHost = new URL(rootUrl).hostname;
  const cookies = await context.cookies();
  return cookies.map((cookie) => {
    const domain = cookie.domain.replace(/^\./, '');
    const classification = classifyHost(domain, rootHost);
    return {
      id: createId('artifact'),
      artifactType: 'cookie',
      name: cookie.name,
      domain,
      url: null,
      vendorId: classification.vendorId,
      vendorName: classification.vendorName,
      category: classification.category,
      firstParty: classification.firstParty,
      confidence: classification.confidence,
      timestampOffsetMs: Date.now() - startedAt,
      raw: {
        value: cookie.value,
        path: cookie.path,
        secure: cookie.secure,
      },
    };
  });
}

async function collectStorageArtifacts(page: Page, pageUrl: string, startedAt: number, rootUrl: string): Promise<RuntimeArtifact[]> {
  const rootHost = new URL(rootUrl).hostname;
  const storage = await page.evaluate(async () => {
    const local = Object.keys(localStorage).map((key) => ({ scope: 'local-storage', key, value: localStorage.getItem(key) }));
    const session = Object.keys(sessionStorage).map((key) => ({ scope: 'session-storage', key, value: sessionStorage.getItem(key) }));
    const indexedDbNames = typeof indexedDB.databases === 'function'
      ? (await indexedDB.databases()).map((database) => database.name).filter(Boolean)
      : [];

    return {
      local,
      session,
      indexedDbNames,
    };
  });

  return [
    ...storage.local.map((item) => ({
      id: createId('artifact'),
      artifactType: 'local-storage' as const,
      name: item.key,
      domain: new URL(pageUrl).hostname,
      url: pageUrl,
      ...classifyHost(new URL(pageUrl).hostname, rootHost),
      timestampOffsetMs: Date.now() - startedAt,
      raw: { value: item.value },
    })),
    ...storage.session.map((item) => ({
      id: createId('artifact'),
      artifactType: 'session-storage' as const,
      name: item.key,
      domain: new URL(pageUrl).hostname,
      url: pageUrl,
      ...classifyHost(new URL(pageUrl).hostname, rootHost),
      timestampOffsetMs: Date.now() - startedAt,
      raw: { value: item.value },
    })),
    ...storage.indexedDbNames.map((name) => ({
      id: createId('artifact'),
      artifactType: 'indexed-db' as const,
      name: name ?? null,
      domain: new URL(pageUrl).hostname,
      url: pageUrl,
      ...classifyHost(new URL(pageUrl).hostname, rootHost),
      timestampOffsetMs: Date.now() - startedAt,
      raw: {},
    })),
  ];
}

async function collectDomArtifacts(page: Page, pageUrl: string, startedAt: number, rootUrl: string): Promise<RuntimeArtifact[]> {
  const rootHost = new URL(rootUrl).hostname;
  const [scripts, iframes] = await Promise.all([
    page.locator('script[src]').evaluateAll((elements) => elements.map((element) => (element as HTMLScriptElement).src)),
    page.locator('iframe[src]').evaluateAll((elements) => elements.map((element) => (element as HTMLIFrameElement).src)),
  ]);

  return [
    ...scripts.map((src) => toDomArtifact('script', src, startedAt, rootHost)),
    ...iframes.map((src) => toDomArtifact('iframe', src, startedAt, rootHost)),
    {
      id: createId('artifact'),
      artifactType: 'script',
      name: 'page-url',
      domain: new URL(pageUrl).hostname,
      url: pageUrl,
      ...classifyHost(new URL(pageUrl).hostname, rootHost),
      timestampOffsetMs: Date.now() - startedAt,
      raw: {},
    },
  ];
}

function toDomArtifact(type: 'script' | 'iframe', src: string, startedAt: number, rootHost: string): RuntimeArtifact {
  const classification = classifyUrl(src, `https://${rootHost}`);
  return {
    id: createId('artifact'),
    artifactType: type,
    name: src,
    domain: new URL(src).hostname,
    url: src,
    vendorId: classification.vendorId,
    vendorName: classification.vendorName,
    category: classification.category,
    firstParty: classification.firstParty,
    confidence: classification.confidence,
    timestampOffsetMs: Date.now() - startedAt,
    raw: {},
  };
}

function inferPageKind(url: string, text: string): PageKind {
  const haystack = `${url} ${text}`;
  const matched = pageKindMatchers.find((entry) => entry.pattern.test(haystack));
  return matched?.kind ?? 'other';
}

function inferAction(label: string): ConsentAction | null {
  for (const matcher of actionMatchers) {
    if (matcher.patterns.some((pattern) => pattern.test(label))) {
      return matcher.action;
    }
  }
  return null;
}

function inferCmpVendor(html: string) {
  if (/onetrust/i.test(html)) {
    return 'OneTrust';
  }
  if (/cookiebot/i.test(html)) {
    return 'Cookiebot';
  }
  return null;
}

function buildSelector(element: Element) {
  const htmlElement = element as HTMLElement;
  if (htmlElement.id) {
    return `#${cssEscape(htmlElement.id)}`;
  }
  const className = Array.from(htmlElement.classList).slice(0, 2).map(cssEscape).join('.');
  const tagName = htmlElement.tagName.toLowerCase();
  return className ? `${tagName}.${className}` : tagName;
}

function cssEscape(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

function emptyConsentUi(): ConsentUiDetection {
  return {
    present: false,
    cmpVendor: null,
    rejectVisible: false,
    granularControlsPresent: false,
    bannerText: '',
    htmlSnippet: '',
    buttons: [],
    limitations: [],
  };
}

function classifyHost(host: string, rootHost: string) {
  const vendor = classifyVendorByHost(host);
  return {
    vendorId: vendor.vendorId,
    vendorName: vendor.vendorName,
    category: vendor.category,
    firstParty: host === rootHost || host.endsWith(`.${rootHost}`),
    confidence: vendor.confidence,
  };
}

function classifyUrl(url: string, rootUrl: string) {
  const host = new URL(url).hostname;
  return classifyHost(host, new URL(rootUrl).hostname);
}

function sanitizeFilename(url: string) {
  return url.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
}