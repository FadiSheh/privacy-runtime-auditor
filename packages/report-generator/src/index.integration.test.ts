import { describe, expect, it } from 'vitest';

import type { CompletedScan } from '@pra/shared';

import { renderJsonReport, renderPdfReport } from './index';

const report: CompletedScan = {
  scanId: 'scan_1',
  projectId: 'project_1',
  rootUrl: 'https://example.com/',
  startedAt: new Date().toISOString(),
  finishedAt: new Date().toISOString(),
  pages: [],
  policies: [],
  findings: [],
  scores: {
    overall: 90,
    preConsentBehavior: 90,
    consentUx: 90,
    runtimeBlockingEffectiveness: 90,
    policyRuntimeAlignment: 90,
    regressionStability: 90,
  },
  riskLevel: 'low',
  diff: null,
  privacyDependentTrackers: [],
  privacySignals: {
    adTrackers: { detected: false, summary: '0 ad trackers found', count: 0, entities: [], evidence: [] },
    thirdPartyCookies: { detected: false, summary: '0 third-party cookies found', count: 0, entities: [], evidence: [] },
    cookieBlockerEvasion: { detected: false, summary: "Tracking that evades cookie blockers wasn't found.", count: 0, entities: [], evidence: [] },
    canvasFingerprinting: { detected: false, summary: 'Canvas fingerprinting was not detected', count: 0, entities: [], evidence: [] },
    sessionRecorders: { detected: false, summary: 'Session recording services not found', count: 0, entities: [], evidence: [] },
    keystrokeCapture: { detected: false, summary: 'We did not find this website capturing keystrokes.', count: 0, entities: [], evidence: [] },
    facebookPixel: { detected: false, summary: 'Facebook Pixel not found', count: 0, entities: [], evidence: [] },
    tiktokPixel: { detected: false, summary: 'TikTok Pixel not found', count: 0, entities: [], evidence: [] },
    xPixel: { detected: false, summary: 'X Pixel not found', count: 0, entities: [], evidence: [] },
    googleAnalyticsRemarketing: { detected: false, summary: "Google Analytics 'remarketing audiences' feature not found.", count: 0, entities: [], evidence: [] },
  },
  limitations: [],
};

describe('report generator', () => {
  it('renders json output', () => {
    expect(renderJsonReport(report)).toContain('scan_1');
  });

  it('renders a pdf buffer', async () => {
    const pdf = await renderPdfReport(report);
    expect(pdf.buffer.length).toBeGreaterThan(0);
  });
});