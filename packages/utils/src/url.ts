import { z } from 'zod';

const privateHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

const urlSchema = z.string().trim().min(1);

export function normalizeUrl(input: string): string {
  const raw = urlSchema.parse(input);

  if (/^[a-z][a-z\d+.-]*:\/\//i.test(raw) && !/^https?:\/\//i.test(raw)) {
    throw new Error('Only HTTP and HTTPS URLs are supported');
  }

  const candidate = raw.match(/^https?:\/\//i) ? raw : `https://${raw}`;
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

export function isPrivateTarget(input: string): boolean {
  const url = new URL(normalizeUrl(input));
  const host = url.hostname;

  if (privateHosts.has(host)) {
    return true;
  }

  return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|169\.254\.)/.test(host);
}

export function assertSafeScanTarget(input: string): string {
  const normalized = normalizeUrl(input);

  if (process.env.ALLOW_PRIVATE_TARGETS === 'true' || process.env.NODE_ENV === 'test') {
    return normalized;
  }

  if (isPrivateTarget(normalized)) {
    throw new Error('Private or loopback targets are not allowed for scans.');
  }

  return normalized;
}

export function sameHostname(source: string, candidate: string, allowedSubdomains: string[] = []): boolean {
  const sourceUrl = new URL(normalizeUrl(source));
  const candidateUrl = new URL(normalizeUrl(candidate));

  if (candidateUrl.hostname === sourceUrl.hostname) {
    return true;
  }

  return allowedSubdomains.some((subdomain) => candidateUrl.hostname === subdomain.toLowerCase());
}
