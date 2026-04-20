import type {
  CompletedScan,
  ConsentUiDetection,
  Evidence,
  Finding,
  PageScanResult,
  PolicyPage,
  RuntimeArtifact,
  ScanDiffSummary,
  ScenarioScanResult,
  ScenarioType,
} from '@pra/shared';
import { createId } from '@pra/utils';

import { diffPolicyAgainstRuntime } from '@pra/policy-parser';

function nonEssentialArtifacts(artifacts: RuntimeArtifact[]) {
  return artifacts.filter((artifact) => ['analytics', 'advertising', 'social', 'functional'].includes(artifact.category ?? 'unknown'));
}

function cookies(artifacts: RuntimeArtifact[]) {
  return artifacts.filter((artifact) => artifact.artifactType === 'cookie');
}

function scenario(page: PageScanResult, type: ScenarioType) {
  return page.scenarioResults.find((result) => result.scenarioType === type);
}

function evidenceForArtifacts(artifacts: RuntimeArtifact[]): Evidence[] {
  return artifacts.slice(0, 5).map((artifact) => ({
    type: artifact.artifactType === 'request' ? 'request' : artifact.artifactType === 'cookie' ? 'cookie' : 'scenario-metadata',
    label: artifact.name ?? artifact.url ?? artifact.domain ?? artifact.artifactType,
    artifactId: artifact.id,
    data: artifact.raw,
  } satisfies Evidence));
}

function createFinding(scanId: string, ruleCode: string, severity: Finding['severity'], title: string, summary: string, description: string, remediation: string, artifacts: RuntimeArtifact[]): Finding {
  return {
    id: createId('finding'),
    scanId,
    ruleCode,
    severity,
    title,
    summary,
    description,
    remediation,
    status: 'open',
    scoreImpact: severity === 'critical' ? 30 : severity === 'high' ? 20 : severity === 'medium' ? 10 : severity === 'low' ? 5 : 1,
    evidence: evidenceForArtifacts(artifacts),
  };
}

function collectRuntimeArtifacts(scan: Pick<CompletedScan, 'pages'>) {
  return scan.pages.flatMap((page) => page.scenarioResults.flatMap((result) => result.artifacts));
}

function isRejectIneffective(rejectScenario: ScenarioScanResult | undefined, noConsentScenario: ScenarioScanResult | undefined) {
  if (!rejectScenario || !noConsentScenario) {
    return false;
  }

  const noConsentNonEssential = new Set(nonEssentialArtifacts(noConsentScenario.artifacts).map((artifact) => artifact.domain ?? artifact.url ?? artifact.name));
  const rejectNonEssential = nonEssentialArtifacts(rejectScenario.artifacts);

  return rejectNonEssential.some((artifact) => noConsentNonEssential.has(artifact.domain ?? artifact.url ?? artifact.name));
}

function isGranularIneffective(granularScenario: ScenarioScanResult | undefined) {
  if (!granularScenario) {
    return false;
  }

  return nonEssentialArtifacts(granularScenario.artifacts).length > 0;
}

function hasDarkPattern(consent: ConsentUiDetection) {
  return consent.present && !consent.rejectVisible && consent.buttons.some((button) => button.action === 'accept-all');
}

export function evaluateRules(input: { scanId: string; pages: PageScanResult[]; policies: PolicyPage[]; diff: ScanDiffSummary | null }): Finding[] {
  const findings: Finding[] = [];
  const runtimeArtifacts = input.pages.flatMap((page) => page.scenarioResults.flatMap((result) => result.artifacts));
  const policyDiff = diffPolicyAgainstRuntime(input.policies, runtimeArtifacts);

  for (const page of input.pages) {
    const noConsent = scenario(page, 'no-consent');
    const acceptAll = scenario(page, 'accept-all');
    const rejectAll = scenario(page, 'reject-all');
    const granular = scenario(page, 'granular');

    if (noConsent) {
      const nonEssential = nonEssentialArtifacts(noConsent.artifacts);

      if (nonEssential.length > 0) {
        findings.push(
          createFinding(
            input.scanId,
            'R001',
            'high',
            'Non-essential tracking before consent',
            'Non-essential runtime activity was observed before any consent interaction.',
            `Observed ${nonEssential.length} non-essential artifacts before consent on ${page.url}.`,
            'Delay analytics, advertising, social, and similar tags until affirmative consent.',
            nonEssential,
          ),
        );

        if (!noConsent.consent.present) {
          findings.push(
            createFinding(
              input.scanId,
              'R002',
              'critical',
              'Consent banner missing',
              'Non-essential tracking was observed without a detectable consent interface.',
              `No consent interface was detected on ${page.url} while non-essential activity was present.`,
              'Display a consent interface before any non-essential tracking executes.',
              nonEssential,
            ),
          );
        }
      }

      const nonEssentialCookies = cookies(nonEssential);
      if (nonEssentialCookies.length > 0) {
        findings.push(
          createFinding(
            input.scanId,
            'R009',
            'high',
            'Non-essential cookies deposited before interaction',
            'Cookies classified as non-essential were stored before consent.',
            `Detected ${nonEssentialCookies.length} non-essential cookies before consent on ${page.url}.`,
            'Block non-essential cookies until valid consent has been collected.',
            nonEssentialCookies,
          ),
        );
      }

      if (hasDarkPattern(noConsent.consent)) {
        findings.push(
          createFinding(
            input.scanId,
            'R008',
            'medium',
            'Ambiguous or dark-pattern risk',
            'Accept-all is easier to access than reject-all.',
            `Reject-all was not visible on the first layer of the consent interface on ${page.url}.`,
            'Present reject-all with equal prominence on the first layer of the consent interface.',
            [],
          ),
        );
      }
    }

    if (acceptAll?.consent.present && !acceptAll.consent.rejectVisible) {
      findings.push(
        createFinding(
          input.scanId,
          'R003',
          'medium',
          'Reject-all absent on first layer',
          'Accept-all was available without an equivalent reject-all action.',
          `Accept-all was detected without a same-layer reject-all option on ${page.url}.`,
          'Add a same-layer reject-all action with equivalent prominence to accept-all.',
          [],
        ),
      );
    }

    if (isRejectIneffective(rejectAll, noConsent)) {
      findings.push(
        createFinding(
          input.scanId,
          'R004',
          'high',
          'Reject-all ineffective',
          'Reject-all did not prevent non-essential activity.',
          `Non-essential artifacts remained after reject-all on ${page.url}.`,
          'Ensure reject-all blocks non-essential tags, pixels, and storage writes.',
          nonEssentialArtifacts(rejectAll?.artifacts ?? []),
        ),
      );
    }

    if (granular && isGranularIneffective(granular)) {
      findings.push(
        createFinding(
          input.scanId,
          'R005',
          'high',
          'Granular choices ineffective',
          'Disabling non-essential categories did not change runtime behavior.',
          `Granular controls did not block non-essential activity on ${page.url}.`,
          'Wire category toggles to actual script and cookie blocking logic.',
          nonEssentialArtifacts(granular.artifacts),
        ),
      );
    }

    if (acceptAll?.consent.present && !acceptAll.consent.granularControlsPresent) {
      findings.push(
        createFinding(
          input.scanId,
          'R010',
          'low',
          'No evidence of meaningful preference controls',
          'A settings path exists but meaningful category controls were not detected.',
          `Consent settings were either absent or non-functional on ${page.url}.`,
          'Provide category-level controls with effective behavioral changes.',
          [],
        ),
      );
    }
  }

  if (policyDiff.runtimeOnlyVendors.length > 0) {
    findings.push(
      createFinding(
        input.scanId,
        'R006',
        'medium',
        'Policy/runtime mismatch: vendor observed but not declared',
        'Runtime vendors were observed that were not declared in the discovered policies.',
        `Observed vendors missing from policy text: ${policyDiff.runtimeOnlyVendors.join(', ')}.`,
        'Update the privacy and cookie policies to disclose the observed vendors.',
        runtimeArtifacts.filter((artifact) => policyDiff.runtimeOnlyVendors.includes((artifact.vendorName ?? '').toLowerCase())),
      ),
    );
  }

  if (policyDiff.categoryMismatches.length > 0) {
    findings.push(
      createFinding(
        input.scanId,
        'R007',
        'medium',
        'Policy/runtime mismatch: category inconsistency',
        'Runtime categories were observed that do not align with the discovered policy categories.',
        `Observed categories missing from policy text: ${policyDiff.categoryMismatches.join(', ')}.`,
        'Align policy category disclosures with actual runtime behavior.',
        runtimeArtifacts.filter((artifact) => artifact.category && policyDiff.categoryMismatches.includes(artifact.category.toLowerCase())),
      ),
    );
  }

  if (input.diff?.newVendors.length) {
    findings.push(
      createFinding(
        input.scanId,
        'R011',
        'info',
        'New vendor introduced since baseline',
        'New vendors were introduced relative to the baseline scan.',
        `New vendors: ${input.diff.newVendors.join(', ')}.`,
        'Review the newly introduced vendors and update consent controls and policy disclosures if required.',
        runtimeArtifacts.filter((artifact) => input.diff?.newVendors.includes(artifact.vendorName ?? '')),
      ),
    );
  }

  if (input.diff?.newFailures.length) {
    findings.push(
      createFinding(
        input.scanId,
        'R012',
        'medium',
        'Regression: behavior changed after site update',
        'Rules that previously passed now fail in the current scan.',
        `New failing rules since baseline: ${input.diff.newFailures.join(', ')}.`,
        'Compare the current deployment with the baseline and restore consent gating or policy alignment.',
        collectRuntimeArtifacts({ pages: input.pages }),
      ),
    );
  }

  return dedupeFindings(findings);
}

function dedupeFindings(findings: Finding[]) {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.ruleCode}:${finding.summary}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}