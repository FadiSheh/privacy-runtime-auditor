import { eq, inArray } from 'drizzle-orm';

import {
  artifacts,
  findings,
  observations,
  projects,
  policies,
  scanDiffs,
  scanPages,
  scans,
  scenarios,
} from '@pra/db';
import type { ArtifactType, CompletedScan, Finding, PageKind, PageScanResult, PolicyPage, RuntimeArtifact, ScanDiffSummary, ScenarioScanResult, ScenarioType, VendorCategory } from '@pra/shared';
import { detectPrivacyDependentTrackers, summarizePrivacySignals } from '@pra/rules-engine';
import { createId } from '@pra/utils';

import { getDatabase } from './database';

export async function markScanRunning(scanId: string) {
  const { db } = await getDatabase();
  await db.update(scans).set({ status: 'running', startedAt: new Date() }).where(eq(scans.id, scanId));
}

export async function updateScanActivity(
  scanId: string,
  activity: {
    phase?: string;
    currentPage?: string;
    currentUrl?: string;
    message?: string;
  },
) {
  const { db } = await getDatabase();
  await db.update(scans).set({ currentActivityJson: activity }).where(eq(scans.id, scanId));
}

export async function persistCompletedScan(scan: CompletedScan, baselineScanId?: string | null, pagesAlreadyPersisted = false) {
  const { db } = await getDatabase();

  if (!pagesAlreadyPersisted) {
    for (const page of scan.pages) {
      await persistPage(scan.scanId, page);
    }
  }

  for (const policy of scan.policies) {
    await db.insert(policies).values({
      id: createId('policy'),
      scanId: scan.scanId,
      policyType: policy.type,
      url: policy.url,
      rawText: policy.extracted.rawText,
      extractedJson: policy.extracted,
      createdAt: new Date(),
    });
  }

  for (const finding of scan.findings) {
    await db.insert(findings).values({
      id: finding.id,
      scanId: finding.scanId,
      ruleCode: finding.ruleCode,
      severity: finding.severity,
      title: finding.title,
      summary: finding.summary,
      description: finding.description,
      remediation: finding.remediation,
      status: finding.status,
      scoreImpact: finding.scoreImpact,
      evidenceJson: finding.evidence,
      createdAt: new Date(),
    });
  }

  if (scan.diff && baselineScanId) {
    await db.insert(scanDiffs).values({
      id: createId('diff'),
      baselineScanId,
      comparedScanId: scan.scanId,
      diffJson: scan.diff,
      createdAt: new Date(),
    });
  }

  await db.update(scans).set({
    status: 'completed',
    finishedAt: new Date(scan.finishedAt),
    overallScore: scan.scores.overall,
    riskLevel: scan.riskLevel,
  }).where(eq(scans.id, scan.scanId));
}

export async function createPageStubs(scanId: string, pages: Array<{ url: string; pageKind: string }>, scenariosPerPage: number): Promise<void> {
  const { db } = await getDatabase();
  for (const page of pages) {
    const pageId = createId('page');
    await db.insert(scanPages).values({
      id: pageId,
      scanId,
      url: page.url,
      normalizedUrl: page.url,
      pageKind: page.pageKind,
      status: 'pending',
      screenshotPath: null,
      createdAt: new Date(),
    });
    for (let i = 0; i < scenariosPerPage; i++) {
      await db.insert(scenarios).values({
        id: createId('scenario'),
        scanPageId: pageId,
        scenarioType: ['no-consent', 'accept-all', 'reject-all', 'granular'][i] ?? 'no-consent',
        status: 'pending',
        startedAt: null,
        finishedAt: null,
        metadataJson: {},
      });
    }
  }
}

export async function persistPageIncremental(scanId: string, page: PageScanResult): Promise<void> {
  const { db } = await getDatabase();

  // Find the stub page row for this URL and update it
  const stubRows = await db.select().from(scanPages).where(eq(scanPages.scanId, scanId));
  const stub = stubRows.find((r) => r.url === page.url || r.url === page.normalizedUrl);

  if (stub) {
    // Update the stub page to completed
    await db.update(scanPages).set({
      normalizedUrl: page.normalizedUrl,
      pageKind: page.pageKind,
      status: 'completed',
      screenshotPath: page.scenarioResults[0]?.screenshotPath ?? null,
    }).where(eq(scanPages.id, stub.id));

    // Get existing stub scenarios for this page and update them one by one
    const stubScenarios = await db.select().from(scenarios).where(eq(scenarios.scanPageId, stub.id));

    for (const [idx, scenarioResult] of page.scenarioResults.entries()) {
      const stubScenario = stubScenarios[idx];
      if (stubScenario) {
        await db.update(scenarios).set({
          scenarioType: scenarioResult.scenarioType,
          status: scenarioResult.status,
          startedAt: new Date(),
          finishedAt: new Date(),
          metadataJson: {
            ...scenarioResult.metadata,
            consentPresent: scenarioResult.consent.present,
            cmpVendor: scenarioResult.consent.cmpVendor,
            rejectVisible: scenarioResult.consent.rejectVisible,
            granularControlsPresent: scenarioResult.consent.granularControlsPresent,
            bannerText: scenarioResult.consent.bannerText,
            htmlSnippet: scenarioResult.consent.htmlSnippet,
            buttons: scenarioResult.consent.buttons,
            limitations: scenarioResult.consent.limitations,
            domEvidence: scenarioResult.domEvidence,
            errorMessage: scenarioResult.errorMessage,
          },
        }).where(eq(scenarios.id, stubScenario.id));

        if (scenarioResult.screenshotPath) {
          await db.insert(artifacts).values({
            id: createId('artifact'),
            scanId,
            kind: 'screenshot',
            path: scenarioResult.screenshotPath,
            metadataJson: { scenarioType: scenarioResult.scenarioType, pageUrl: page.url },
            createdAt: new Date(),
          });
        }

        for (const artifact of scenarioResult.artifacts) {
          await db.insert(observations).values({
            id: artifact.id,
            scenarioId: stubScenario.id,
            artifactType: artifact.artifactType,
            name: artifact.name,
            domain: artifact.domain,
            url: artifact.url,
            vendorId: artifact.vendorId,
            category: artifact.category,
            firstParty: artifact.firstParty,
            confidence: artifact.confidence === null ? null : Math.round((artifact.confidence ?? 0) * 100),
            timestampOffsetMs: artifact.timestampOffsetMs,
            rawJson: {
              vendorName: artifact.vendorName,
              ...artifact.raw,
            },
          });
        }
      }
    }
  } else {
    // No stub found — fall back to full persist
    await persistPage(scanId, page);
  }
}

export async function markScanFailed(scanId: string, errorMessage: string) {
  const { db } = await getDatabase();
  await db.update(scans).set({
    status: 'failed',
    finishedAt: new Date(),
    riskLevel: 'high',
    configJson: { errorMessage },
  }).where(eq(scans.id, scanId));
}

export async function markScanCancelled(scanId: string) {
  const { db } = await getDatabase();
  const existing = await db.select().from(scans).where(eq(scans.id, scanId)).limit(1);
  // Only update if the DB hasn't already been set to cancelled by the API
  if (existing[0] && existing[0].status !== 'cancelled') {
    await db.update(scans).set({
      status: 'cancelled',
      finishedAt: new Date(),
    }).where(eq(scans.id, scanId));
  }
}

export async function loadLatestCompletedScan(projectId: string, excludeScanId: string) {
  const { db } = await getDatabase();
  const result = await db.select().from(scans).where(eq(scans.projectId, projectId));
  return result.filter((scan) => scan.id !== excludeScanId && scan.status === 'completed').sort((a, b) => {
    const left = a.finishedAt ? a.finishedAt.getTime() : 0;
    const right = b.finishedAt ? b.finishedAt.getTime() : 0;
    return right - left;
  })[0] ?? null;
}

async function persistPage(scanId: string, page: PageScanResult) {
  const { db } = await getDatabase();
  const pageId = createId('page');

  await db.insert(scanPages).values({
    id: pageId,
    scanId,
    url: page.url,
    normalizedUrl: page.normalizedUrl,
    pageKind: page.pageKind,
    status: 'completed',
    screenshotPath: page.scenarioResults[0]?.screenshotPath ?? null,
    createdAt: new Date(),
  });

  for (const scenario of page.scenarioResults) {
    const scenarioId = createId('scenario');
    await db.insert(scenarios).values({
      id: scenarioId,
      scanPageId: pageId,
      scenarioType: scenario.scenarioType,
      status: scenario.status,
      startedAt: new Date(),
      finishedAt: new Date(),
      metadataJson: {
        ...scenario.metadata,
        consentPresent: scenario.consent.present,
        cmpVendor: scenario.consent.cmpVendor,
        rejectVisible: scenario.consent.rejectVisible,
        granularControlsPresent: scenario.consent.granularControlsPresent,
        bannerText: scenario.consent.bannerText,
        htmlSnippet: scenario.consent.htmlSnippet,
        buttons: scenario.consent.buttons,
        limitations: scenario.consent.limitations,
        domEvidence: scenario.domEvidence,
        errorMessage: scenario.errorMessage,
      },
    });

    if (scenario.screenshotPath) {
      await db.insert(artifacts).values({
        id: createId('artifact'),
        scanId,
        kind: 'screenshot',
        path: scenario.screenshotPath,
        metadataJson: { scenarioType: scenario.scenarioType, pageUrl: page.url },
        createdAt: new Date(),
      });
    }

    for (const artifact of scenario.artifacts) {
      await db.insert(observations).values({
        id: artifact.id,
        scenarioId,
        artifactType: artifact.artifactType,
        name: artifact.name,
        domain: artifact.domain,
        url: artifact.url,
        vendorId: artifact.vendorId,
        category: artifact.category,
        firstParty: artifact.firstParty,
        confidence: artifact.confidence === null ? null : Math.round((artifact.confidence ?? 0) * 100),
        timestampOffsetMs: artifact.timestampOffsetMs,
        rawJson: {
          vendorName: artifact.vendorName,
          ...artifact.raw,
        },
      });
    }
  }
}

export async function loadCompletedScan(scanId: string): Promise<CompletedScan | null> {
  const { db } = await getDatabase();
  const scanRows = await db.select().from(scans).where(eq(scans.id, scanId)).limit(1);
  const scan = scanRows[0];

  if (!scan) {
    return null;
  }

  const pageRows = await db.select().from(scanPages).where(eq(scanPages.scanId, scanId));
  const scenarioRows = pageRows.length
    ? await db.select().from(scenarios).where(inArray(scenarios.scanPageId, pageRows.map((page) => page.id)))
    : [];
  const observationRows = scenarioRows.length
    ? await db.select().from(observations).where(inArray(observations.scenarioId, scenarioRows.map((scenario) => scenario.id)))
    : [];
  const policyRows = await db.select().from(policies).where(eq(policies.scanId, scanId));
  const findingRows = await db.select().from(findings).where(eq(findings.scanId, scanId));
  const diffRows = await db.select().from(scanDiffs).where(eq(scanDiffs.comparedScanId, scanId)).limit(1);
  const artifactRows = await db.select().from(artifacts).where(eq(artifacts.scanId, scanId));
  const projectRows = await db.select().from(projects).where(eq(projects.id, scan.projectId)).limit(1);
  const project = projectRows[0];

  const pages = pageRows.map((page) => ({
    url: page.url,
    normalizedUrl: page.normalizedUrl,
    pageKind: page.pageKind as PageKind,
    scenarioResults: scenarioRows
      .filter((scenario) => scenario.scanPageId === page.id)
      .map((scenario) => ({
        scenarioType: scenario.scenarioType as ScenarioType,
        status: scenario.status as ScenarioScanResult['status'],
        consent: {
          present: Boolean((scenario.metadataJson as Record<string, unknown>).consentPresent),
          cmpVendor: ((scenario.metadataJson as Record<string, unknown>).cmpVendor as string | null) ?? null,
          rejectVisible: Boolean((scenario.metadataJson as Record<string, unknown>).rejectVisible),
          granularControlsPresent: Boolean((scenario.metadataJson as Record<string, unknown>).granularControlsPresent),
          bannerText: ((scenario.metadataJson as Record<string, unknown>).bannerText as string | undefined) ?? '',
          htmlSnippet: ((scenario.metadataJson as Record<string, unknown>).htmlSnippet as string | undefined) ?? '',
          buttons: ((scenario.metadataJson as Record<string, unknown>).buttons as CompletedScan['pages'][number]['scenarioResults'][number]['consent']['buttons'] | undefined) ?? [],
          limitations: ((scenario.metadataJson as Record<string, unknown>).limitations as string[] | undefined) ?? [],
        },
        artifacts: observationRows
          .filter((observation) => observation.scenarioId === scenario.id)
          .map((observation) => ({
            id: observation.id,
            artifactType: observation.artifactType as ArtifactType,
            name: observation.name,
            domain: observation.domain,
            url: observation.url,
            vendorId: observation.vendorId,
            vendorName:
              observation.rawJson && typeof observation.rawJson === 'object' && 'vendorName' in observation.rawJson
                ? String((observation.rawJson as Record<string, unknown>).vendorName)
                : null,
            category: observation.category as VendorCategory | null,
            firstParty: observation.firstParty,
            confidence: observation.confidence === null ? null : observation.confidence / 100,
            timestampOffsetMs: observation.timestampOffsetMs,
            raw: observation.rawJson as Record<string, unknown>,
          })) as RuntimeArtifact[],
        screenshotPath:
          artifactRows.find(
            (artifact) =>
              artifact.kind === 'screenshot' &&
              typeof artifact.metadataJson === 'object' &&
              artifact.metadataJson !== null &&
              (artifact.metadataJson as Record<string, unknown>).pageUrl === page.url &&
              (artifact.metadataJson as Record<string, unknown>).scenarioType === scenario.scenarioType,
          )?.path ?? null,
        bannerScreenshotPath: null,
        domEvidence: ((scenario.metadataJson as Record<string, unknown>).domEvidence as string[] | undefined) ?? [],
        errorMessage: ((scenario.metadataJson as Record<string, unknown>).errorMessage as string | null | undefined) ?? null,
        metadata: scenario.metadataJson as Record<string, unknown>,
      })),
  }));

  return {
    scanId,
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
    findings: findingRows.map((finding) => ({
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
    })) as Finding[],
    scores: {
      overall: scan.overallScore ?? 0,
      preConsentBehavior: scan.overallScore ?? 0,
      consentUx: scan.overallScore ?? 0,
      runtimeBlockingEffectiveness: scan.overallScore ?? 0,
      policyRuntimeAlignment: scan.overallScore ?? 0,
      regressionStability: scan.overallScore ?? 0,
    },
    riskLevel: (scan.riskLevel as CompletedScan['riskLevel']) ?? 'low',
    diff: (diffRows[0]?.diffJson as ScanDiffSummary | undefined) ?? null,
    privacyDependentTrackers: detectPrivacyDependentTrackers(pages),
    privacySignals: summarizePrivacySignals(pages),
    limitations: [],
  };
}

export function buildDiffSummary(current: CompletedScan, baseline: CompletedScan | null): ScanDiffSummary | null {
  if (!baseline) {
    return null;
  }

  const currentVendors = new Set(current.pages.flatMap((page) => page.scenarioResults.flatMap((scenario) => scenario.artifacts.map((artifact) => artifact.vendorName).filter(Boolean))));
  const baselineVendors = new Set(baseline.pages.flatMap((page) => page.scenarioResults.flatMap((scenario) => scenario.artifacts.map((artifact) => artifact.vendorName).filter(Boolean))));
  const currentCookies = new Set(current.pages.flatMap((page) => page.scenarioResults.flatMap((scenario) => scenario.artifacts.filter((artifact) => artifact.artifactType === 'cookie').map((artifact) => artifact.name).filter(Boolean))));
  const baselineCookies = new Set(baseline.pages.flatMap((page) => page.scenarioResults.flatMap((scenario) => scenario.artifacts.filter((artifact) => artifact.artifactType === 'cookie').map((artifact) => artifact.name).filter(Boolean))));
  const currentFailures = new Set(current.findings.map((finding) => finding.ruleCode));
  const baselineFailures = new Set(baseline.findings.map((finding) => finding.ruleCode));

  return {
    newVendors: Array.from(currentVendors).filter((vendor) => !baselineVendors.has(vendor)).map(String),
    newCookies: Array.from(currentCookies).filter((cookie) => !baselineCookies.has(cookie)).map(String),
    newFailures: Array.from(currentFailures).filter((code) => !baselineFailures.has(code)),
    resolvedFindings: Array.from(baselineFailures).filter((code) => !currentFailures.has(code)),
  };
}

export function toCompletedScanFromStored(params: {
  scanId: string;
  projectId: string;
  rootUrl: string;
  pages: PageScanResult[];
  policies: PolicyPage[];
  findings: CompletedScan['findings'];
  scores: CompletedScan['scores'];
  riskLevel: CompletedScan['riskLevel'];
  diff: ScanDiffSummary | null;
  privacyDependentTrackers?: CompletedScan['privacyDependentTrackers'];
  privacySignals?: CompletedScan['privacySignals'];
  startedAt: string;
  finishedAt: string;
}): CompletedScan {
  return {
    scanId: params.scanId,
    projectId: params.projectId,
    rootUrl: params.rootUrl,
    pages: params.pages,
    policies: params.policies,
    findings: params.findings,
    scores: params.scores,
    riskLevel: params.riskLevel,
    diff: params.diff,
    privacyDependentTrackers: params.privacyDependentTrackers ?? detectPrivacyDependentTrackers(params.pages),
    privacySignals: params.privacySignals ?? summarizePrivacySignals(params.pages),
    limitations: [],
    startedAt: params.startedAt,
    finishedAt: params.finishedAt,
  };
}