import type { PageScanResult, PrivacyDependentTracker, RuntimeArtifact, ScenarioType, VendorCategory } from '@pra/shared';

const scenarioOrder: ScenarioType[] = ['no-consent', 'accept-all', 'reject-all', 'granular'];
const nonEssentialCategories = new Set<VendorCategory>(['analytics', 'advertising', 'marketing', 'social', 'functional']);

function isNonEssentialArtifact(artifact: RuntimeArtifact) {
  return artifact.category !== null && nonEssentialCategories.has(artifact.category);
}

function buildTrackerKey(artifact: RuntimeArtifact): string | null {
  if (artifact.vendorId) {
    return `vendor:${artifact.vendorId}`;
  }

  if (artifact.vendorName && artifact.vendorName !== 'Unknown vendor') {
    return `vendor-name:${artifact.vendorName.toLowerCase()}`;
  }

  if (artifact.domain) {
    return `domain:${artifact.domain.toLowerCase()}`;
  }

  if (artifact.url) {
    try {
      return `url:${new URL(artifact.url).hostname.toLowerCase()}`;
    } catch {
      return `url:${artifact.url.toLowerCase()}`;
    }
  }

  if (artifact.name) {
    return `name:${artifact.name.toLowerCase()}`;
  }

  return null;
}

function buildTrackerLabel(artifact: RuntimeArtifact, trackerKey: string) {
  if (artifact.vendorName && artifact.vendorName !== 'Unknown vendor') {
    return artifact.vendorName;
  }

  return artifact.domain ?? artifact.name ?? trackerKey;
}

export function detectPrivacyDependentTrackers(pages: PageScanResult[]): PrivacyDependentTracker[] {
  const trackers: PrivacyDependentTracker[] = [];

  for (const page of pages) {
    const completedScenarios = scenarioOrder.filter((scenarioType) =>
      page.scenarioResults.some((result) => result.scenarioType === scenarioType && result.status === 'completed'),
    );

    if (completedScenarios.length < 2) {
      continue;
    }

    const grouped = new Map<
      string,
      {
        sample: RuntimeArtifact;
        activeScenarios: Set<ScenarioType>;
        artifactTypes: Set<RuntimeArtifact['artifactType']>;
        evidenceArtifactIds: Set<string>;
      }
    >();

    for (const scenarioType of completedScenarios) {
      const scenario = page.scenarioResults.find((result) => result.scenarioType === scenarioType && result.status === 'completed');

      if (!scenario) {
        continue;
      }

      const seenInScenario = new Set<string>();

      for (const artifact of scenario.artifacts.filter(isNonEssentialArtifact)) {
        const trackerKey = buildTrackerKey(artifact);
        if (!trackerKey) {
          continue;
        }

        let entry = grouped.get(trackerKey);
        if (!entry) {
          entry = {
            sample: artifact,
            activeScenarios: new Set<ScenarioType>(),
            artifactTypes: new Set<RuntimeArtifact['artifactType']>(),
            evidenceArtifactIds: new Set<string>(),
          };
          grouped.set(trackerKey, entry);
        }

        entry.artifactTypes.add(artifact.artifactType);
        entry.evidenceArtifactIds.add(artifact.id);

        if (!seenInScenario.has(trackerKey)) {
          entry.activeScenarios.add(scenarioType);
          seenInScenario.add(trackerKey);
        }
      }
    }

    for (const [trackerKey, entry] of grouped.entries()) {
      const activeScenarios = completedScenarios.filter((scenarioType) => entry.activeScenarios.has(scenarioType));

      if (activeScenarios.length === 0 || activeScenarios.length === completedScenarios.length) {
        continue;
      }

      trackers.push({
        pageUrl: page.url,
        pageKind: page.pageKind,
        trackerKey,
        trackerLabel: buildTrackerLabel(entry.sample, trackerKey),
        vendorName: entry.sample.vendorName,
        domain: entry.sample.domain,
        category: entry.sample.category ?? 'unknown',
        activeScenarios,
        inactiveScenarios: completedScenarios.filter((scenarioType) => !entry.activeScenarios.has(scenarioType)),
        artifactTypes: Array.from(entry.artifactTypes).sort(),
        evidenceArtifactIds: Array.from(entry.evidenceArtifactIds).sort(),
      });
    }
  }

  return trackers.sort((left, right) => {
    if (left.pageUrl !== right.pageUrl) {
      return left.pageUrl.localeCompare(right.pageUrl);
    }

    return left.trackerLabel.localeCompare(right.trackerLabel);
  });
}