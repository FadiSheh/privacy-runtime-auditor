import { eq, inArray } from 'drizzle-orm';

import { observations, projects, scanPages, scans as scansTable, scenarios } from '@pra/db';
import type { CompletedScan, Finding, PageKind, PageScanResult, ScenarioScanResult, ScenarioType } from '@pra/shared';

import { calculateScores, detectPrivacyDependentTrackers, riskLevelFromScore, summarizePrivacySignals } from '@pra/rules-engine';

import { getDatabase } from './database';
import { getScanArtifacts, getScanDiff, getScanFindings, getScanPolicies } from './scans';

export async function buildCompletedScanReport(scanId: string): Promise<CompletedScan> {
  const { db } = await getDatabase();
  const [scanRows, pageRows, findingRows, policyRows, diffRow, artifactRows] = await Promise.all([
    db.select().from(scansTable).where(eq(scansTable.id, scanId)).limit(1),
    db.select().from(scanPages).where(eq(scanPages.scanId, scanId)),
    getScanFindings(scanId),
    getScanPolicies(scanId),
    getScanDiff(scanId),
    getScanArtifacts(scanId),
  ]);

  const scan = scanRows[0];

  if (!scan) {
    throw new Error('Scan not found');
  }

  const project = (await db.select().from(projects).where(eq(projects.id, scan.projectId)).limit(1))[0];
  const scenarioRows = pageRows.length
    ? await db.select().from(scenarios).where(inArray(scenarios.scanPageId, pageRows.map((page) => page.id)))
    : [];
  const observationRows = scenarioRows.length
    ? await db.select().from(observations).where(inArray(observations.scenarioId, scenarioRows.map((scenario) => scenario.id)))
    : [];

  const pages = pageRows.map((page) => {
    const pageScenarios = scenarioRows
      .filter((scenario) => scenario.scanPageId === page.id)
      .map((scenario) => {
        const scenarioArtifacts = observationRows
          .filter((observation) => observation.scenarioId === scenario.id)
          .map((observation) => ({
            id: observation.id,
            artifactType: observation.artifactType,
            name: observation.name,
            domain: observation.domain,
            url: observation.url,
            vendorId: observation.vendorId,
            vendorName:
              observation.rawJson && typeof observation.rawJson === 'object' && 'vendorName' in observation.rawJson
                ? String((observation.rawJson as Record<string, unknown>).vendorName)
                : null,
            category: observation.category,
            firstParty: observation.firstParty,
            confidence: observation.confidence === null ? null : observation.confidence / 100,
            timestampOffsetMs: observation.timestampOffsetMs,
            raw: observation.rawJson as Record<string, unknown>,
          }));

        const metadata = (scenario.metadataJson ?? {}) as Record<string, unknown>;
        const screenshot = artifactRows.find(
          (artifact) =>
            artifact.kind === 'screenshot' &&
            typeof artifact.metadataJson === 'object' &&
            artifact.metadataJson !== null &&
            (artifact.metadataJson as Record<string, unknown>).pageUrl === page.url &&
            (artifact.metadataJson as Record<string, unknown>).scenarioType === scenario.scenarioType,
        );

        return {
          scenarioType: scenario.scenarioType as ScenarioType,
          status: scenario.status as ScenarioScanResult['status'],
          consent: {
            present: Boolean(metadata.consentPresent),
            cmpVendor: typeof metadata.cmpVendor === 'string' ? metadata.cmpVendor : null,
            rejectVisible: Boolean(metadata.rejectVisible),
            granularControlsPresent: Boolean(metadata.granularControlsPresent),
            bannerText: typeof metadata.bannerText === 'string' ? metadata.bannerText : '',
            htmlSnippet: typeof metadata.htmlSnippet === 'string' ? metadata.htmlSnippet : '',
            buttons: Array.isArray(metadata.buttons)
              ? (metadata.buttons as CompletedScan['pages'][number]['scenarioResults'][number]['consent']['buttons'])
              : [],
            limitations: Array.isArray(metadata.limitations) ? metadata.limitations.map(String) : [],
          },
          artifacts: scenarioArtifacts,
          screenshotPath: screenshot?.path ?? null,
          bannerScreenshotPath: null,
          domEvidence: Array.isArray(metadata.domEvidence) ? metadata.domEvidence.map(String) : [],
          errorMessage: typeof metadata.errorMessage === 'string' ? metadata.errorMessage : null,
          metadata,
        };
      });

    return {
      url: page.url,
      normalizedUrl: page.normalizedUrl,
      pageKind: page.pageKind as PageKind,
      scenarioResults: pageScenarios,
    } as PageScanResult;
  });

  const findings: Finding[] = findingRows.map((finding) => ({
    id: finding.id,
    scanId: finding.scanId,
    ruleCode: finding.ruleCode,
    severity: finding.severity as Finding['severity'],
    title: finding.title,
    summary: finding.summary,
    description: finding.description,
    remediation: finding.remediation,
    status: finding.status as Finding['status'],
    scoreImpact: finding.scoreImpact,
    evidence: Array.isArray(finding.evidenceJson) ? finding.evidenceJson : [],
  }));
  const scores = calculateScores(findings);

  return {
    scanId: scan.id,
    projectId: scan.projectId,
    rootUrl: project?.rootUrl ?? '',
    startedAt: scan.startedAt?.toISOString() ?? new Date().toISOString(),
    finishedAt: scan.finishedAt?.toISOString() ?? new Date().toISOString(),
    pages,
    policies: policyRows.map((policy) => ({
      type: policy.policyType === 'cookie' ? 'cookie' : 'privacy',
      url: policy.url,
      extracted: policy.extractedJson as CompletedScan['policies'][number]['extracted'],
    })),
    findings,
    scores,
    riskLevel: scan.overallScore ? riskLevelFromScore(scan.overallScore) : riskLevelFromScore(scores.overall),
    diff: diffRow?.diffJson as CompletedScan['diff'],
    privacyDependentTrackers: detectPrivacyDependentTrackers(pages),
    privacySignals: summarizePrivacySignals(pages),
    limitations: [],
  };
}

export async function buildJsonReport(scanId: string) {
  return buildCompletedScanReport(scanId);
}

export async function buildPrivacyDependentTrackerList(scanId: string) {
  const report = await buildCompletedScanReport(scanId);
  return report.privacyDependentTrackers;
}
