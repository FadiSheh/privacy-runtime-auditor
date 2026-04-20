import { describe, expect, it } from 'vitest';

import { diffPolicyAgainstRuntime, discoverPolicyLinks, extractPolicySummary } from './index';

describe('policy parser', () => {
  it('discovers policy links from page html', () => {
    const links = discoverPolicyLinks(
      '<a href="/privacy-policy">Privacy Policy</a><a href="/contact">Contact</a>',
      'https://example.com/',
    );
    expect(links).toEqual([{ type: 'privacy', url: 'https://example.com/privacy-policy' }]);
  });

  it('extracts headings and policy text', () => {
    const summary = extractPolicySummary('<html><body><h1>Privacy Policy</h1><p>We use analytics cookies with consent.</p></body></html>');
    expect(summary.headings).toContain('Privacy Policy');
    expect(summary.categories).toContain('analytics');
  });

  it('detects runtime-only vendors', () => {
    const diff = diffPolicyAgainstRuntime(
      [
        {
          type: 'privacy',
          url: 'https://example.com/privacy',
          extracted: {
            headings: [],
            rawText: 'We use Google Analytics.',
            vendors: ['Google Analytics'],
            categories: ['analytics'],
            purposes: [],
            retentionStatements: [],
            consentStatements: [],
          },
        },
      ],
      [
        {
          id: 'artifact_1',
          artifactType: 'request',
          name: 'Meta Pixel',
          domain: 'connect.facebook.net',
          url: 'https://connect.facebook.net/en_US/fbevents.js',
          vendorId: 'vendor_meta',
          vendorName: 'Meta',
          category: 'advertising',
          firstParty: false,
          confidence: 0.98,
          timestampOffsetMs: 12,
          raw: {},
        },
      ],
    );

    expect(diff.runtimeOnlyVendors).toContain('meta');
  });
});