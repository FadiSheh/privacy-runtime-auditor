import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { customAlphabet } from 'nanoid';
import { chromium, type BrowserContext, type Page, type Request as PlaywrightRequest } from 'playwright';

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
import { classifyVendorByHost } from '@pra/vendor-registry';

const idAlphabet = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 16);

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

interface BrowserInstrumentationSnapshot {
  browserApis: Array<{ name: string; count: number; scriptUrl: string | null }>;
  eventListeners: Array<{ eventType: string; tagName: string; capturesKeystrokes: boolean }>;
  networkDuringInput: Array<{ channel: string; inputType: string | null; url: string }>;
}

function getChromiumLaunchOptions() {
  const executablePath = resolveChromiumPath();

  return {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    ...(executablePath ? { executablePath } : {}),
  };
}

function createId(prefix: string): string {
  return `${prefix}_${idAlphabet()}`;
}

function normalizeUrl(input: string): string {
  const raw = input.trim();
  if (!raw) {
    throw new Error('URL cannot be empty');
  }

  if (/^[a-z][a-z\d+.-]*:\/\//i.test(raw) && !/^https?:\/\//i.test(raw)) {
    throw new Error('Only HTTP and HTTPS URLs are supported');
  }

  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const url = new URL(candidate);

  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase();

  if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) {
    url.port = '';
  }

  if (!url.pathname) {
    url.pathname = '/';
  }

  if (url.pathname !== '/' && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1);
  }

  url.hash = '';
  return url.toString();
}

function sameHostname(source: string, candidate: string, allowedSubdomains: string[] = []): boolean {
  const sourceUrl = new URL(normalizeUrl(source));
  const candidateUrl = new URL(normalizeUrl(candidate));

  if (candidateUrl.hostname === sourceUrl.hostname) {
    return true;
  }

  return allowedSubdomains.some((subdomain) => candidateUrl.hostname === subdomain.toLowerCase());
}

function resolveChromiumPath() {
  const configuredPath = process.env.CHROMIUM_PATH;
  if (configuredPath) {
    return configuredPath;
  }

  const candidates = ['/usr/bin/chromium', '/usr/bin/chromium-browser'];
  return candidates.find((candidate) => existsSync(candidate));
}

export interface BrowserScanOptions {
  rootUrl: string;
  config: ScanConfig;
  outputPath: string;
  onDiscovery?: (pages: Array<{ url: string; pageKind: PageKind }>, scenariosPerPage: number) => Promise<void>;
  onPageComplete?: (page: PageScanResult, completedPages: number, totalPages: number) => Promise<void>;
}

export interface BrowserScanResult {
  pages: PageScanResult[];
  homepageHtml: string;
}

export async function discoverPages(rootUrl: string, config: ScanConfig): Promise<Array<{ url: string; pageKind: PageKind }>> {
  const browser = await chromium.launch(getChromiumLaunchOptions());
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

    let candidateUrl: string;
    try {
      candidateUrl = normalizeUrl(new URL(item.href, rootUrl).toString());
    } catch {
      continue;
    }

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
  const browser = await chromium.launch(getChromiumLaunchOptions());
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

  if (options.onDiscovery) {
    await options.onDiscovery(discoveredPages, scenarioSequence.length);
  }

  for (const [index, pageInfo] of discoveredPages.entries()) {
    const scenarioResults: ScenarioScanResult[] = [];

    for (const scenarioType of scenarioSequence) {
      scenarioResults.push(await runScenario(pageInfo.url, pageInfo.pageKind, scenarioType, options));
    }

    const completedPage: PageScanResult = {
      url: pageInfo.url,
      normalizedUrl: normalizeUrl(pageInfo.url),
      pageKind: pageInfo.pageKind,
      scenarioResults,
    };

    pages.push(completedPage);

    if (options.onPageComplete) {
      await options.onPageComplete(completedPage, index + 1, discoveredPages.length);
    }
  }

  return {
    pages,
    homepageHtml,
  };
}

async function runScenario(url: string, pageKind: PageKind, scenarioType: ScenarioType, options: BrowserScanOptions): Promise<ScenarioScanResult> {
  const browser = await chromium.launch(getChromiumLaunchOptions());
  const context = await browser.newContext();
  const page = await context.newPage();
  const requests: RuntimeArtifact[] = [];
  const requestArtifacts = new Map<PlaywrightRequest, RuntimeArtifact>();
  const startedAt = Date.now();

  await installPageInstrumentation(page);

  page.on('request', (request) => {
    const requestUrl = request.url();
    const classification = classifyUrl(requestUrl, options.rootUrl);
    const artifact: RuntimeArtifact = {
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
        headers: request.headers(),
        postData: request.postData(),
      },
    };
    requests.push(artifact);
    requestArtifacts.set(request, artifact);
  });

  page.on('response', async (response) => {
    const artifact = requestArtifacts.get(response.request());
    if (!artifact) {
      return;
    }

    try {
      artifact.raw = {
        ...artifact.raw,
        status: response.status(),
        responseHeaders: await response.allHeaders(),
      };
    } catch {
      artifact.raw = {
        ...artifact.raw,
        status: response.status(),
      };
    }
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
  const instrumentationArtifacts = await collectInstrumentationArtifacts(page, url, startedAt, options.rootUrl);

    const screenshotPath = join(options.outputPath, `${sanitizeFilename(url)}-${scenarioType}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    return {
      scenarioType,
      status: 'completed',
      consent,
      artifacts: [...requests, ...cookieArtifacts, ...storageArtifacts, ...domArtifacts, ...instrumentationArtifacts],
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
  const buttons = await page.locator('button, [role="button"], a').evaluateAll((elements) => {
    function buildSel(el: Element): string {
      const htmlEl = el as HTMLElement;
      if (htmlEl.id) {
        return `#${htmlEl.id.replace(/[^a-zA-Z0-9_-]/g, '\\$&')}`;
      }
      const cls = Array.from(htmlEl.classList).slice(0, 2).map((c) => c.replace(/[^a-zA-Z0-9_-]/g, '\\$&')).join('.');
      const tag = htmlEl.tagName.toLowerCase();
      return cls ? `${tag}.${cls}` : tag;
    }
    return elements
      .map((element) => {
        const text = (element.textContent ?? '').trim();
        if (!text) {
          return null;
        }
        return {
          label: text,
          selector: buildSel(element),
        };
      })
      .filter((button): button is { label: string; selector: string } => Boolean(button));
  });

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
    .find((line) => /cookie|consent|preferences/i.test(line))
    ?.trim() ?? '';

  const htmlSnippet = await page.locator('body').evaluate((element) => element.innerHTML.slice(0, 2000));
  const rejectVisible = matchedButtons.some((button) => button.action === 'reject-all');
  const granularControlsPresent = matchedButtons.some((button) => button.action === 'open-preferences' || button.action === 'save-preferences');

  return {
    present: matchedButtons.length > 0 || /cookie|consent|preferences/i.test(bannerText),
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

async function collectInstrumentationArtifacts(page: Page, pageUrl: string, startedAt: number, rootUrl: string): Promise<RuntimeArtifact[]> {
  const rootHost = new URL(rootUrl).hostname;
  const pageHost = new URL(pageUrl).hostname;
  const snapshot = await page.evaluate<BrowserInstrumentationSnapshot>(() => {
    const empty = { browserApis: [], eventListeners: [], networkDuringInput: [] };
    const state = (window as typeof window & { __praSignals?: unknown }).__praSignals;
    if (!state || typeof state !== 'object') {
      return empty;
    }

    const typed = state as {
      browserApis?: Record<string, { count: number; scriptUrl?: string | null }>;
      eventListeners?: Array<{ eventType: string; tagName: string; capturesKeystrokes: boolean }>;
      networkDuringInput?: Array<{ channel: string; inputType: string | null; url: string }>;
    };

    return {
      browserApis: Object.entries(typed.browserApis ?? {}).map(([name, entry]) => ({
        name,
        count: entry.count,
        scriptUrl: entry.scriptUrl ?? null,
      })),
      eventListeners: Array.isArray(typed.eventListeners) ? typed.eventListeners : [],
      networkDuringInput: Array.isArray(typed.networkDuringInput) ? typed.networkDuringInput : [],
    };
  });

  return [
    ...snapshot.browserApis.map((entry) => {
      const sourceUrl = entry.scriptUrl ?? pageUrl;
      const classification = safeClassifyUrl(sourceUrl, rootUrl) ?? classifyHost(pageHost, rootHost);
      return {
        id: createId('artifact'),
        artifactType: 'browser-api' as const,
        name: entry.name,
        domain: tryGetHostname(sourceUrl) ?? pageHost,
        url: sourceUrl,
        vendorId: classification.vendorId,
        vendorName: classification.vendorName,
        category: classification.category,
        firstParty: classification.firstParty,
        confidence: classification.confidence,
        timestampOffsetMs: Date.now() - startedAt,
        raw: { callCount: entry.count },
      } satisfies RuntimeArtifact;
    }),
    ...snapshot.eventListeners.map((entry) => ({
      id: createId('artifact'),
      artifactType: 'event-listener' as const,
      name: entry.eventType,
      domain: pageHost,
      url: pageUrl,
      ...classifyHost(pageHost, rootHost),
      timestampOffsetMs: Date.now() - startedAt,
      raw: {
        tagName: entry.tagName,
        capturesKeystrokes: entry.capturesKeystrokes,
      },
    })),
    ...snapshot.networkDuringInput.map((entry) => {
      const classification = safeClassifyUrl(entry.url, rootUrl) ?? classifyHost(pageHost, rootHost);
      return {
        id: createId('artifact'),
        artifactType: 'event-listener' as const,
        name: `input-network:${entry.channel}`,
        domain: tryGetHostname(entry.url) ?? pageHost,
        url: entry.url,
        vendorId: classification.vendorId,
        vendorName: classification.vendorName,
        category: classification.category,
        firstParty: classification.firstParty,
        confidence: classification.confidence,
        timestampOffsetMs: Date.now() - startedAt,
        raw: {
          channel: entry.channel,
          inputType: entry.inputType,
          transmittedDuringInput: true,
        },
      } satisfies RuntimeArtifact;
    }),
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

function safeClassifyUrl(url: string, rootUrl: string) {
  try {
    return classifyUrl(url, rootUrl);
  } catch {
    return null;
  }
}

function tryGetHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

async function installPageInstrumentation(page: Page) {
  await page.addInitScript(() => {
    const target = window as typeof window & {
      __praSignals?: {
        browserApis: Record<string, { count: number; scriptUrl?: string | null }>;
        eventListeners: Array<{ eventType: string; tagName: string; capturesKeystrokes: boolean }>;
        networkDuringInput: Array<{ channel: string; inputType: string | null; url: string }>;
      };
    };

    if (target.__praSignals) {
      return;
    }

    target.__praSignals = {
      browserApis: {},
      eventListeners: [],
      networkDuringInput: [],
    };

    const state = target.__praSignals;
    let lastInputType: string | null = null;
    let lastInputAt = 0;

    const markBrowserApi = (name: string) => {
      const current = state.browserApis[name] ?? { count: 0, scriptUrl: null };
      current.count += 1;
      current.scriptUrl ??= document.currentScript instanceof HTMLScriptElement ? document.currentScript.src : null;
      state.browserApis[name] = current;
    };

    const patchMethod = (holder: Record<string, unknown> | undefined, key: string, label: string) => {
      if (!holder || typeof holder[key] !== 'function') {
        return;
      }

      const original = holder[key] as (...args: unknown[]) => unknown;
      if ((original as { __praWrapped?: boolean }).__praWrapped) {
        return;
      }

      const wrapped = function patchedMethod(this: unknown, ...args: unknown[]) {
        markBrowserApi(label);
        return original.apply(this, args);
      };

      (wrapped as { __praWrapped?: boolean }).__praWrapped = true;
      holder[key] = wrapped;
    };

    patchMethod(HTMLCanvasElement.prototype as unknown as Record<string, unknown>, 'toDataURL', 'canvas.toDataURL');
    patchMethod(HTMLCanvasElement.prototype as unknown as Record<string, unknown>, 'toBlob', 'canvas.toBlob');
    patchMethod(CanvasRenderingContext2D.prototype as unknown as Record<string, unknown>, 'getImageData', 'canvas.getImageData');
    patchMethod(CanvasRenderingContext2D.prototype as unknown as Record<string, unknown>, 'measureText', 'canvas.measureText');

    if ('WebGLRenderingContext' in window) {
      patchMethod(WebGLRenderingContext.prototype as unknown as Record<string, unknown>, 'getParameter', 'webgl.getParameter');
      patchMethod(WebGLRenderingContext.prototype as unknown as Record<string, unknown>, 'readPixels', 'webgl.readPixels');
      patchMethod(WebGLRenderingContext.prototype as unknown as Record<string, unknown>, 'getSupportedExtensions', 'webgl.getSupportedExtensions');
    }

    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function patchedAddEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) {
      const eventType = String(type);

      try {
        const tagName = this instanceof Element
          ? this.tagName.toLowerCase()
          : this === document
            ? 'document'
            : this === window
              ? 'window'
              : this && typeof this === 'object' && 'constructor' in this && typeof this.constructor === 'function'
                ? this.constructor.name.toLowerCase()
                : 'unknown';

        const formSurface = tagName === 'input' || tagName === 'textarea' || tagName === 'select' || tagName === 'form' || tagName === 'document' || tagName === 'window';
        const tracksBehavior = /^(keydown|keyup|keypress|beforeinput|input|change|mousemove|scroll|click)$/i.test(eventType);

        if (formSurface && tracksBehavior) {
          state.eventListeners.push({
            eventType,
            tagName,
            capturesKeystrokes: /^(keydown|keyup|keypress|beforeinput|input|change)$/i.test(eventType),
          });
        }
      } catch {
        // Keep the page functional if instrumentation cannot inspect a target.
      }

      return originalAddEventListener.call(this, eventType, listener, options);
    };

    const recordInput = (event: Event) => {
      lastInputType = event.type;
      lastInputAt = Date.now();
    };

    ['keydown', 'keyup', 'keypress', 'beforeinput', 'input', 'change'].forEach((eventName) => {
      document.addEventListener(eventName, recordInput, true);
    });

    const recordNetworkDuringInput = (channel: string, url: string) => {
      if (!url || Date.now() - lastInputAt > 1500) {
        return;
      }

      state.networkDuringInput.push({ channel, inputType: lastInputType, url });
    };

    const originalFetch = window.fetch.bind(window);
    window.fetch = (async (...args: Parameters<typeof fetch>) => {
      const input = args[0];
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      recordNetworkDuringInput('fetch', url);
      return originalFetch(...args);
    }) as typeof fetch;

    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function patchedOpen(method: string, url: string | URL, async?: boolean, username?: string | null, password?: string | null) {
      (this as XMLHttpRequest & { __praUrl?: string }).__praUrl = String(url);
      return originalOpen.call(this, method, url, async ?? true, username ?? null, password ?? null);
    };

    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function patchedSend(body?: Document | XMLHttpRequestBodyInit | null) {
      recordNetworkDuringInput('xhr', (this as XMLHttpRequest & { __praUrl?: string }).__praUrl ?? '');
      return originalSend.call(this, body);
    };

    const originalSendBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) => {
      recordNetworkDuringInput('beacon', String(url));
      return originalSendBeacon(url, data);
    };
  });
}

function sanitizeFilename(url: string) {
  const raw = url.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  return raw.length > 180 ? raw.slice(0, 180) : raw;
}
