import { desc, eq, inArray } from 'drizzle-orm';

import {
  artifacts,
  findings,
  policies,
  scanDiffs,
  scanPages,
  scans,
  scenarios,
} from '@pra/db';
import type { ScanJob } from '@pra/shared';
import { scanConfigSchema } from '@pra/shared';
import { createId } from '@pra/utils';

import { getDatabase } from './database';
import { getProjectById } from './projects';
import { getScanQueue } from './queue';

export async function createScan(projectId: string, triggeredByUserId?: string | null) {
  const { db } = await getDatabase();
  const project = await getProjectById(projectId);

  if (!project) {
    throw new Error('Project not found');
  }

  const scan = {
    id: createId('scan'),
    projectId,
    status: 'queued',
    triggeredByUserId: triggeredByUserId ?? null,
    startedAt: null,
    finishedAt: null,
    overallScore: null,
    riskLevel: null,
    configJson: scanConfigSchema.parse(project.configJson),
  };

  await db.insert(scans).values(scan);

  const payload: ScanJob = {
    id: scan.id,
    projectId: project.id,
    rootUrl: project.rootUrl,
    config: scanConfigSchema.parse(project.configJson),
  };

  await getScanQueue().add(scan.id, payload, {
    jobId: scan.id,
    removeOnComplete: 50,
    removeOnFail: 50,
  });

  return scan;
}

export async function listProjectScans(projectId: string) {
  const { db } = await getDatabase();
  return db.select().from(scans).where(eq(scans.projectId, projectId)).orderBy(desc(scans.startedAt));
}

export async function getScan(scanId: string) {
  const { db } = await getDatabase();
  const result = await db.select().from(scans).where(eq(scans.id, scanId)).limit(1);
  return result[0] ?? null;
}

export async function getScanPages(scanId: string) {
  const { db } = await getDatabase();
  return db.select().from(scanPages).where(eq(scanPages.scanId, scanId));
}

export async function getScanFindings(scanId: string) {
  const { db } = await getDatabase();
  return db.select().from(findings).where(eq(findings.scanId, scanId)).orderBy(desc(findings.createdAt));
}

export async function getScanPolicies(scanId: string) {
  const { db } = await getDatabase();
  return db.select().from(policies).where(eq(policies.scanId, scanId));
}

export async function getScanArtifacts(scanId: string) {
  const { db } = await getDatabase();
  return db.select().from(artifacts).where(eq(artifacts.scanId, scanId));
}

export async function getScanStatus(scanId: string) {
  const scan = await getScan(scanId);

  if (!scan) {
    return null;
  }

  const pages = await getScanPages(scanId);
  const { db } = await getDatabase();

  const scenarioRows = pages.length
    ? await db
        .select()
        .from(scenarios)
        .where(inArray(scenarios.scanPageId, pages.map((page) => page.id)))
    : [];

  const completedScenarios = scenarioRows.filter((row) => row.status === 'completed').length;
  const totalScenarios = scenarioRows.length;

  // Improved progress calculation with 4 decimal places for precision
  const baseProgress =
    totalScenarios > 0
      ? (completedScenarios / totalScenarios) * 100
      : scan.status === 'completed'
        ? 100
        : 0;

  // Parse current activity if available
  const currentActivity = scan.currentActivityJson as {
    phase?: string;
    currentPage?: string;
    currentUrl?: string;
    message?: string;
  } | null;

  return {
    scanId,
    status: scan.status,
    startedAt: scan.startedAt,
    finishedAt: scan.finishedAt,
    progress: Math.round(baseProgress * 100) / 100, // Keep 2 decimal places for display
    progressPrecise: baseProgress, // Full precision for calculations
    pageCount: pages.length,
    completedScenarios,
    totalScenarios,
    currentActivity: currentActivity || {
      phase: 'waiting',
      message: scan.status === 'queued' ? 'Queued for processing' : 'Initializing',
    },
  };
}


export async function cancelScan(scanId: string) {
  const scan = await getScan(scanId);

  if (!scan) {
    return null;
  }

  if (scan.status !== 'queued' && scan.status !== 'running') {
    return { scanId, alreadyTerminal: true };
  }

  const { db } = await getDatabase();

  // Try to remove from queue (works for queued jobs)
  const queue = getScanQueue();
  const job = await queue.getJob(scanId);
  if (job) {
    await job.remove();
  }

  // Publish a cancellation signal so the worker can abort a running job
  const { getRedisConnection } = await import('./queue.js');
  const redis = getRedisConnection();
  await redis.set(`pra:cancel:${scanId}`, '1', 'EX', 300);
  await redis.quit();

  // Mark the scan as cancelled in the DB
  await db.update(scans)
    .set({ status: 'cancelled', finishedAt: new Date() })
    .where(eq(scans.id, scanId));

  return { scanId, cancelled: true };
}

export async function getScanDiff(scanId: string) {
  const { db } = await getDatabase();
  const result = await db.select().from(scanDiffs).where(eq(scanDiffs.comparedScanId, scanId)).limit(1);
  return result[0] ?? null;
}

export async function setBaseline(scanId: string) {
  const scan = await getScan(scanId);

  if (!scan) {
    throw new Error('Scan not found');
  }

  const priorScans = await listProjectScans(scan.projectId);
  const baseline = priorScans.find((item) => item.id !== scanId && item.status === 'completed');

  if (!baseline) {
    throw new Error('No completed scan available to use as baseline');
  }

  return {
    baselineScanId: baseline.id,
    comparedScanId: scanId,
  };
}