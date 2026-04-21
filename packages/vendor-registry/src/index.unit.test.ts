import { describe, expect, it } from 'vitest';

import { classifyVendorByHost } from './index';

describe('classifyVendorByHost', () => {
  it('classifies known vendor domains', () => {
    expect(classifyVendorByHost('www.google-analytics.com')).toMatchObject({
      vendorName: 'Google Analytics',
      category: 'analytics',
    });
  });

  it('classifies analytics vendors', () => {
    expect(classifyVendorByHost('api.mixpanel.com')).toMatchObject({
      vendorName: 'Mixpanel',
      category: 'analytics',
    });
    expect(classifyVendorByHost('api2.amplitude.com')).toMatchObject({
      vendorName: 'Amplitude',
      category: 'analytics',
    });
    expect(classifyVendorByHost('widget.intercom.io')).toMatchObject({
      vendorName: 'Intercom',
      category: 'analytics',
    });
  });

  it('classifies advertising vendors', () => {
    expect(classifyVendorByHost('ib.adnxs.com')).toMatchObject({
      vendorName: 'AdRoll',
      category: 'advertising',
    });
    expect(classifyVendorByHost('crtg.net')).toMatchObject({
      vendorName: 'Criteo',
      category: 'advertising',
    });
    expect(classifyVendorByHost('trc.taboola.com')).toMatchObject({
      vendorName: 'Taboola',
      category: 'advertising',
    });
  });

  it('classifies social vendors', () => {
    expect(classifyVendorByHost('px.ads.linkedin.com')).toMatchObject({
      vendorName: 'LinkedIn',
      category: 'social',
    });
    expect(classifyVendorByHost('ct.pinterest.com')).toMatchObject({
      vendorName: 'Pinterest',
      category: 'social',
    });
    expect(classifyVendorByHost('analytics.tiktok.com')).toMatchObject({
      vendorName: 'TikTok',
      category: 'social',
    });
  });

  it('classifies marketing vendors', () => {
    expect(classifyVendorByHost('js.hs-scripts.com')).toMatchObject({
      vendorName: 'HubSpot',
      category: 'marketing',
    });
    expect(classifyVendorByHost('klaviyocdn.com')).toMatchObject({
      vendorName: 'Klaviyo',
      category: 'marketing',
    });
  });

  it('classifies functional vendors', () => {
    expect(classifyVendorByHost('fonts.googleapis.com')).toMatchObject({
      vendorName: 'Google Fonts',
      category: 'functional',
    });
    expect(classifyVendorByHost('cdn.cookiebot.com')).toMatchObject({
      vendorName: 'Cookiebot',
      category: 'functional',
    });
  });

  it('handles subdomains correctly', () => {
    expect(classifyVendorByHost('custom.google-analytics.com')).toMatchObject({
      vendorName: 'Google Analytics',
      category: 'analytics',
    });
    expect(classifyVendorByHost('static.hotjar.com')).toMatchObject({
      vendorName: 'Hotjar',
      category: 'analytics',
    });
    expect(classifyVendorByHost('cdn.mouseflow.com')).toMatchObject({
      vendorName: 'Mouseflow',
      category: 'analytics',
    });
    expect(classifyVendorByHost('t.contentsquare.net')).toMatchObject({
      vendorName: 'Contentsquare',
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