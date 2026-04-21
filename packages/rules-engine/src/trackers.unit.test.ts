import { describe, expect, it } from 'vitest';

import type { PageScanResult, ScenarioType } from '@pra/shared';

import { detectPrivacyDependentTrackers } from './trackers';

describe('detectPrivacyDependentTrackers', () => {
  it('reports non-essential trackers whose presence changes across consent scenarios', () => {
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
            artifacts: [],
            screenshotPath: null,
            bannerScreenshotPath: null,
            domEvidence: [],
            errorMessage: null,
            metadata: {},
          },
          {
            scenarioType: 'accept-all',
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
                id: 'artifact_meta_request',
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
            ],
            screenshotPath: null,
            bannerScreenshotPath: null,
            domEvidence: [],
            errorMessage: null,
            metadata: {},
          },
          {
            scenarioType: 'reject-all',
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
            artifacts: [],
            screenshotPath: null,
            bannerScreenshotPath: null,
            domEvidence: [],
            errorMessage: null,
            metadata: {},
          },
          {
            scenarioType: 'granular',
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
                id: 'artifact_google_script',
                artifactType: 'script',
                name: 'gtag',
                domain: 'www.googletagmanager.com',
                url: 'https://www.googletagmanager.com/gtag/js?id=GA-123',
                vendorId: 'vendor_google_analytics',
                vendorName: 'Google Analytics',
                category: 'analytics',
                firstParty: false,
                confidence: 0.98,
                timestampOffsetMs: 15,
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

    expect(detectPrivacyDependentTrackers(pages)).toEqual([
      expect.objectContaining({
        trackerKey: 'vendor:vendor_google_analytics',
        trackerLabel: 'Google Analytics',
        activeScenarios: ['granular'],
        inactiveScenarios: ['no-consent', 'accept-all', 'reject-all'],
      }),
      expect.objectContaining({
        trackerKey: 'vendor:vendor_meta',
        trackerLabel: 'Meta',
        activeScenarios: ['accept-all'],
        inactiveScenarios: ['no-consent', 'reject-all', 'granular'],
      }),
    ]);
  });

  it('ignores trackers that behave the same across all completed scenarios', () => {
    const pages: PageScanResult[] = [
      {
        url: 'https://example.com/',
        normalizedUrl: 'https://example.com/',
        pageKind: 'homepage',
        scenarioResults: (['no-consent', 'accept-all', 'reject-all', 'granular'] as ScenarioType[]).map((scenarioType) => ({
          scenarioType,
          status: 'completed' as const,
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
              id: `artifact_${scenarioType}`,
              artifactType: 'request' as const,
              name: 'Meta Pixel',
              domain: 'connect.facebook.net',
              url: 'https://connect.facebook.net/en_US/fbevents.js',
              vendorId: 'vendor_meta',
              vendorName: 'Meta',
              category: 'advertising' as const,
              firstParty: false,
              confidence: 0.98,
              timestampOffsetMs: 10,
              raw: {},
            },
          ],
          screenshotPath: null,
          bannerScreenshotPath: null,
          domEvidence: [],
          errorMessage: null,
          metadata: {},
        })),
      },
    ];

    expect(detectPrivacyDependentTrackers(pages)).toEqual([]);
  });
});