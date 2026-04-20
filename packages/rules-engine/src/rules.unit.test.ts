import { describe, expect, it } from 'vitest';

import type { PageScanResult, PolicyPage, ScanDiffSummary } from '@pra/shared';

import { evaluateRules } from './rules';

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
        artifacts: [
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
        scenarioType: 'accept-all',
        status: 'completed',
        consent: {
          present: true,
          cmpVendor: null,
          rejectVisible: false,
          granularControlsPresent: false,
          bannerText: 'Accept cookies',
          htmlSnippet: '<div></div>',
          buttons: [{ label: 'Accept all', action: 'accept-all', selector: 'button.accept' }],
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
        scenarioType: 'reject-all',
        status: 'completed',
        consent: {
          present: true,
          cmpVendor: null,
          rejectVisible: true,
          granularControlsPresent: false,
          bannerText: 'Reject cookies',
          htmlSnippet: '<div></div>',
          buttons: [{ label: 'Reject all', action: 'reject-all', selector: 'button.reject' }],
          limitations: [],
        },
        artifacts: [
          {
            id: 'artifact_2',
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
        scenarioType: 'granular',
        status: 'completed',
        consent: {
          present: true,
          cmpVendor: null,
          rejectVisible: true,
          granularControlsPresent: true,
          bannerText: 'Manage preferences',
          htmlSnippet: '<div></div>',
          buttons: [{ label: 'Save preferences', action: 'save-preferences', selector: 'button.save' }],
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

const policies: PolicyPage[] = [
  {
    type: 'privacy',
    url: 'https://example.com/privacy',
    extracted: {
      headings: ['Privacy Policy'],
      rawText: 'We use Google Analytics.',
      vendors: ['Google Analytics'],
      categories: ['analytics'],
      purposes: [],
      retentionStatements: [],
      consentStatements: [],
    },
  },
];

const diff: ScanDiffSummary = {
  newVendors: ['Meta'],
  newCookies: [],
  newFailures: ['R004'],
  resolvedFindings: [],
};

describe('evaluateRules', () => {
  it('emits deterministic findings for the required scenarios', () => {
    const findings = evaluateRules({ scanId: 'scan_1', pages, policies, diff });
    expect(findings.map((finding) => finding.ruleCode)).toEqual(
      expect.arrayContaining(['R001', 'R002', 'R003', 'R004', 'R006', 'R007', 'R011', 'R012']),
    );
  });
});