import { describe, expect, it } from 'vitest';

import type { PageScanResult } from '@pra/shared';

import { summarizePrivacySignals } from './signals';

describe('summarizePrivacySignals', () => {
  it('summarizes tracker, cookie, evasion, pixel, replay, fingerprinting, and keystroke signals', () => {
    const pages: PageScanResult[] = [
      {
        url: 'https://example.com/',
        normalizedUrl: 'https://example.com/',
        pageKind: 'homepage',
        scenarioResults: [
          {
            scenarioType: 'no-consent',
            status: 'completed',
            consent: {
              present: true,
              cmpVendor: null,
              rejectVisible: true,
              granularControlsPresent: true,
              bannerText: '',
              htmlSnippet: '',
              buttons: [],
              limitations: [],
            },
            artifacts: [
              {
                id: 'meta-request',
                artifactType: 'request',
                name: 'Meta Pixel',
                domain: 'connect.facebook.net',
                url: 'https://connect.facebook.net/en_US/fbevents.js',
                vendorId: 'vendor_meta',
                vendorName: 'Meta',
                category: 'advertising',
                firstParty: false,
                confidence: 0.98,
                timestampOffsetMs: 10,
                raw: {},
              },
              {
                id: 'cookie-1',
                artifactType: 'cookie',
                name: '_fbp',
                domain: 'facebook.com',
                url: null,
                vendorId: 'vendor_meta',
                vendorName: 'Meta',
                category: 'advertising',
                firstParty: false,
                confidence: 0.98,
                timestampOffsetMs: 11,
                raw: {},
              },
              {
                id: 'storage-1',
                artifactType: 'local-storage',
                name: 'tracker_id',
                domain: 'example.com',
                url: 'https://example.com/',
                vendorId: null,
                vendorName: 'Unknown vendor',
                category: 'unknown',
                firstParty: true,
                confidence: 0.1,
                timestampOffsetMs: 12,
                raw: { value: 'abc123' },
              },
              {
                id: 'canvas-1',
                artifactType: 'browser-api',
                name: 'canvas.toDataURL',
                domain: 'example.com',
                url: 'https://example.com/',
                vendorId: null,
                vendorName: 'Unknown vendor',
                category: 'unknown',
                firstParty: true,
                confidence: 0.1,
                timestampOffsetMs: 13,
                raw: {},
              },
              {
                id: 'input-1',
                artifactType: 'event-listener',
                name: 'keydown',
                domain: 'example.com',
                url: 'https://example.com/login',
                vendorId: null,
                vendorName: 'Unknown vendor',
                category: 'unknown',
                firstParty: true,
                confidence: 0.1,
                timestampOffsetMs: 14,
                raw: { capturesKeystrokes: true },
              },
              {
                id: 'remarketing-1',
                artifactType: 'request',
                name: 'ga-audiences',
                domain: 'www.googleadservices.com',
                url: 'https://www.googleadservices.com/pagead/conversion/?gclid=test123',
                vendorId: 'vendor_doubleclick',
                vendorName: 'Google Ads / DoubleClick',
                category: 'advertising',
                firstParty: false,
                confidence: 0.98,
                timestampOffsetMs: 15,
                raw: {},
              },
              {
                id: 'session-1',
                artifactType: 'script',
                name: 'https://static.hotjar.com/c/hotjar.js',
                domain: 'static.hotjar.com',
                url: 'https://static.hotjar.com/c/hotjar.js',
                vendorId: 'vendor_hotjar',
                vendorName: 'Hotjar',
                category: 'analytics',
                firstParty: false,
                confidence: 0.98,
                timestampOffsetMs: 16,
                raw: {},
              },
            ],
            screenshotPath: null,
            bannerScreenshotPath: null,
            domEvidence: [],
            errorMessage: null,
            metadata: {},
          },
        ],
      },
    ];

    const summary = summarizePrivacySignals(pages);

    expect(summary.adTrackers.summary).toBe('2 ad trackers found');
    expect(summary.thirdPartyCookies.summary).toBe('1 third-party cookies found');
    expect(summary.cookieBlockerEvasion.detected).toBe(true);
    expect(summary.canvasFingerprinting.detected).toBe(true);
    expect(summary.sessionRecorders.entities).toEqual(['Hotjar']);
    expect(summary.keystrokeCapture.detected).toBe(true);
    expect(summary.facebookPixel.detected).toBe(true);
    expect(summary.googleAnalyticsRemarketing.detected).toBe(true);
  });

  it('returns the expected negative summaries when no signals are present', () => {
    const pages: PageScanResult[] = [
      {
        url: 'https://example.com/',
        normalizedUrl: 'https://example.com/',
        pageKind: 'homepage',
        scenarioResults: [
          {
            scenarioType: 'no-consent',
            status: 'completed',
            consent: {
              present: false,
              cmpVendor: null,
              rejectVisible: false,
              granularControlsPresent: false,
              bannerText: '',
              htmlSnippet: '',
              buttons: [],
              limitations: [],
            },
            artifacts: [],
            screenshotPath: null,
            bannerScreenshotPath: null,
            domEvidence: [],
            errorMessage: null,
            metadata: {},
          },
        ],
      },
    ];

    const summary = summarizePrivacySignals(pages);

    expect(summary.adTrackers.summary).toBe('0 ad trackers found');
    expect(summary.thirdPartyCookies.summary).toBe('0 third-party cookies found');
    expect(summary.cookieBlockerEvasion.summary).toBe("Tracking that evades cookie blockers wasn't found.");
    expect(summary.canvasFingerprinting.summary).toBe('Canvas fingerprinting was not detected');
    expect(summary.sessionRecorders.summary).toBe('Session recording services not found');
    expect(summary.keystrokeCapture.summary).toBe('We did not find this website capturing keystrokes.');
    expect(summary.facebookPixel.summary).toBe('Facebook Pixel not found');
    expect(summary.tiktokPixel.summary).toBe('TikTok Pixel not found');
    expect(summary.xPixel.summary).toBe('X Pixel not found');
    expect(summary.googleAnalyticsRemarketing.summary).toBe("Google Analytics 'remarketing audiences' feature not found.");
  });

  it('does not classify first-party static content as cookie-blocker evasion', () => {
    const pages: PageScanResult[] = [
      {
        url: 'https://savoirfairelinux.com/',
        normalizedUrl: 'https://savoirfairelinux.com/',
        pageKind: 'homepage',
        scenarioResults: [
          {
            scenarioType: 'no-consent',
            status: 'completed',
            consent: {
              present: false,
              cmpVendor: null,
              rejectVisible: false,
              granularControlsPresent: false,
              bannerText: '',
              htmlSnippet: '',
              buttons: [],
              limitations: [],
            },
            artifacts: [
              {
                id: 'image-with-etag',
                artifactType: 'request',
                name: 'image',
                domain: 'savoirfairelinux.com',
                url: 'https://savoirfairelinux.com/sites/default/files/styles/card/public/case-study.png?uuid=abc123',
                vendorId: null,
                vendorName: 'Unknown vendor',
                category: 'unknown',
                firstParty: true,
                confidence: 0.1,
                timestampOffsetMs: 10,
                raw: {
                  resourceType: 'image',
                  responseHeaders: {
                    etag: '"asset-version"',
                    'content-type': 'image/png',
                  },
                },
              },
              {
                id: 'css-with-id',
                artifactType: 'request',
                name: 'stylesheet',
                domain: 'savoirfairelinux.com',
                url: 'https://savoirfairelinux.com/themes/custom/site.css?cid=layout',
                vendorId: null,
                vendorName: 'Unknown vendor',
                category: 'unknown',
                firstParty: true,
                confidence: 0.1,
                timestampOffsetMs: 11,
                raw: {
                  resourceType: 'stylesheet',
                  responseHeaders: {
                    etag: '"css-version"',
                    'content-type': 'text/css',
                  },
                },
              },
            ],
            screenshotPath: null,
            bannerScreenshotPath: null,
            domEvidence: [],
            errorMessage: null,
            metadata: {},
          },
        ],
      },
    ];

    const summary = summarizePrivacySignals(pages);

    expect(summary.cookieBlockerEvasion.detected).toBe(false);
    expect(summary.cookieBlockerEvasion.entities).toEqual([]);
  });
});
