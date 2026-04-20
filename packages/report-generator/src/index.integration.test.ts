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