import { createServer } from 'node:http';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { discoverPages } from './index';

describe('browser runner', () => {
  let baseUrl = '';
  let server: ReturnType<typeof createServer>;

  beforeAll(async () => {
    server = createServer((request, response) => {
      if (request.url === '/privacy-policy') {
        response.writeHead(200, { 'content-type': 'text/html' });
        response.end('<html><body><h1>Privacy Policy</h1></body></html>');
        return;
      }

      response.writeHead(200, { 'content-type': 'text/html' });
      response.end('<html><body><a href="/privacy-policy">Privacy Policy</a><a href="/shop">Shop</a></body></html>');
    });

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
});