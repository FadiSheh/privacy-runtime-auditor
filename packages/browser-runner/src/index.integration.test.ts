import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { discoverPages, runBrowserScan } from './index';

describe('browser runner', () => {
  let baseUrl = '';
  let outputPath = '';
  let server: ReturnType<typeof createServer>;

  beforeAll(async () => {
    server = createServer((request, response) => {
      if (request.url?.startsWith('/collect')) {
        response.writeHead(204);
        response.end();
        return;
      }

      if (request.url === '/instrumented') {
        response.writeHead(200, { 'content-type': 'text/html' });
        response.end(`
          <html>
            <body>
              <input id="email" />
              <script>
                const input = document.getElementById('email');
                input.addEventListener('keydown', () => undefined);
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                context.measureText('privacy');
                context.getImageData(0, 0, 1, 1);
                canvas.toDataURL();
                input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'a' }));
                fetch('/collect?uid=test-123');
              </script>
            </body>
          </html>
        `);
        return;
      }

      if (request.url === '/privacy-policy') {
        response.writeHead(200, { 'content-type': 'text/html' });
        response.end('<html><body><h1>Privacy Policy</h1></body></html>');
        return;
      }

      response.writeHead(200, { 'content-type': 'text/html' });
      response.end(`
        <html>
          <body>
            <input id="homepage-email" />
            <a href="/privacy-policy">Privacy Policy</a>
            <a href="/instrumented">Instrumented</a>
            <a href="/shop">Shop</a>
            <script>
              const input = document.getElementById('homepage-email');
              input.addEventListener('keydown', () => undefined);
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d');
              context.measureText('privacy');
              context.getImageData(0, 0, 1, 1);
              canvas.toDataURL();
              input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'a' }));
              fetch('/collect?uid=test-123');
            </script>
          </body>
        </html>
      `);
    });

    outputPath = await mkdtemp(join(tmpdir(), 'pra-browser-runner-'));

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        if (address && typeof address !== 'string') {
          baseUrl = `http://127.0.0.1:${address.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await rm(outputPath, { recursive: true, force: true });
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  });

  it('discovers bounded same-host pages', async () => {
    const pages = await discoverPages(baseUrl, {
      maxPages: 5,
      scanTimeoutMs: 10000,
      locale: 'en',
      region: 'eu',
      userAgentProfile: 'desktop-chrome',
      preActionWaitMs: 10,
      postActionWaitMs: 10,
      allowedSubdomains: [],
      includeUrlPatterns: [],
      excludeUrlPatterns: [],
    });

    expect(pages.some((page) => /privacy-policy/.test(page.url))).toBe(true);
  });

  it('captures browser api and input instrumentation signals', async () => {
    const result = await runBrowserScan({
      rootUrl: baseUrl,
      outputPath,
      config: {
        maxPages: 1,
        scanTimeoutMs: 10000,
        locale: 'en',
        region: 'eu',
        userAgentProfile: 'desktop-chrome',
        preActionWaitMs: 10,
        postActionWaitMs: 10,
        allowedSubdomains: [],
        includeUrlPatterns: [],
        excludeUrlPatterns: [],
      },
    });

    const instrumentedPage = result.pages.find((page) => page.url === `${baseUrl}/`);
    expect(instrumentedPage).toBeDefined();

    const noConsent = instrumentedPage?.scenarioResults.find((scenario) => scenario.scenarioType === 'no-consent');
    expect(noConsent?.artifacts.some((artifact) => artifact.artifactType === 'browser-api' && artifact.name === 'canvas.toDataURL')).toBe(true);
    expect(noConsent?.artifacts.some((artifact) => artifact.artifactType === 'event-listener' && artifact.name === 'keydown')).toBe(true);
    expect(noConsent?.artifacts.some((artifact) => artifact.raw.transmittedDuringInput === true)).toBe(true);
  }, 15000);
});