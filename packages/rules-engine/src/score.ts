import type { Finding, RiskLevel, ScoreBreakdown } from '@pra/shared';

const severityWeights = {
  critical: 30,
  high: 20,
  medium: 10,
  low: 5,
  info: 1,
} as const;

export function calculateScores(findings: Finding[]): ScoreBreakdown {
  const totalPenalty = findings.reduce((sum, finding) => sum + severityWeights[finding.severity], 0);
  const overall = Math.max(0, 100 - totalPenalty);

  return {
    overall,
    preConsentBehavior: Math.max(0, 100 - totalPenalty),
    consentUx: Math.max(0, 100 - Math.round(totalPenalty * 0.9)),
    runtimeBlockingEffectiveness: Math.max(0, 100 - Math.round(totalPenalty * 1.1)),
    policyRuntimeAlignment: Math.max(0, 100 - Math.round(totalPenalty * 0.8)),
    regressionStability: Math.max(0, 100 - Math.round(totalPenalty * 0.7)),
  };
}

export function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 85) {
    return 'low';
  }

  if (score >= 65) {
    return 'moderate';
  }

  if (score >= 40) {
    return 'elevated';
  }

  return 'high';
}