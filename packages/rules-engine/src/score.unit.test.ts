import { describe, expect, it } from 'vitest';

import type { Finding } from '@pra/shared';

import { calculateScores, riskLevelFromScore } from './score';

const findings: Finding[] = [
  {
    id: 'finding_1',
    scanId: 'scan_1',
    ruleCode: 'R001',
    severity: 'high',
    title: 'Non-essential tracking before consent',
    summary: 'Analytics traffic observed before consent.',
    description: 'Analytics traffic was observed before any consent interaction.',
    remediation: 'Block analytics until consent.',
    status: 'open',
    scoreImpact: 20,
    evidence: [],
  },
];

describe('calculateScores', () => {
  it('penalizes findings by severity', () => {
    expect(calculateScores(findings).overall).toBe(80);
  });
});

describe('riskLevelFromScore', () => {
  it('maps low scores to high risk', () => {
    expect(riskLevelFromScore(30)).toBe('high');
  });
});