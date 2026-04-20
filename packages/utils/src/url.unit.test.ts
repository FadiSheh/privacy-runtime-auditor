import { afterEach, describe, expect, it } from 'vitest';

import { assertSafeScanTarget, normalizeUrl, sameHostname } from './url';

const originalNodeEnv = process.env.NODE_ENV;
const originalAllowPrivateTargets = process.env.ALLOW_PRIVATE_TARGETS;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  process.env.ALLOW_PRIVATE_TARGETS = originalAllowPrivateTargets;
});

describe('normalizeUrl', () => {
  it('adds https when the scheme is missing', () => {
    expect(normalizeUrl('Example.com')).toBe('https://example.com/');
  });

  it('removes default ports and fragments', () => {
    expect(normalizeUrl('https://example.com:443/path/#fragment')).toBe('https://example.com/path');
  });
});

describe('assertSafeScanTarget', () => {
  it('rejects loopback hosts outside test bypass mode', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.ALLOW_PRIVATE_TARGETS;

    expect(() => assertSafeScanTarget('http://localhost:3000')).toThrow(/not allowed/);
  });
});

describe('sameHostname', () => {
  it('matches the root hostname', () => {
    expect(sameHostname('https://example.com', 'https://example.com/about')).toBe(true);
  });

  it('supports explicitly allowed subdomains', () => {
    expect(sameHostname('https://example.com', 'https://shop.example.com', ['shop.example.com'])).toBe(true);
  });
});