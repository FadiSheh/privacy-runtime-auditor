import { describe, expect, it } from 'vitest';

import { classifyVendorByHost } from './index';

describe('classifyVendorByHost', () => {
  it('classifies known vendor domains', () => {
    expect(classifyVendorByHost('www.google-analytics.com')).toMatchObject({
      vendorName: 'Google Analytics',
      category: 'analytics',
    });
  });

  it('returns unknown for unmapped domains', () => {
    expect(classifyVendorByHost('example.invalid')).toMatchObject({
      vendorName: 'Unknown vendor',
      category: 'unknown',
    });
  });
});