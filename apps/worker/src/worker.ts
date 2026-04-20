import { Worker } from 'bullmq';
import IORedis from 'ioredis';

import { fetchPageHtml, runBrowserScan } from '@pra/browser-runner';
import { extractPolicySummary, discoverPolicyLinks } from '@pra/policy-parser';
import { evaluateRules, calculateScores, riskLevelFromScore } from '@pra/rules-engine';
import type { ScanJob } from '@pra/shared';
import { createLogger } from '@pra/utils';

import { getWorkerConfig } from './lib/config';
import { buildDiffSummary, loadCompletedScan, loadLatestCompletedScan, markScanFailed, markScanRunning, persistCompletedScan, toCompletedScanFromStored } from './lib/persist';

const logger = createLogger('pra-worker');
const scanQueueName = 'pra-scan-queue';

export async function processScanJob(jobData: ScanJob) {
  logger.info({ scanId: jobData.id }, 'Received scan job');
  await markScanRunning(jobData.id);

  try {
    const config = getWorkerConfig();
    const outputPath = `${config.STORAGE_PATH}/${jobData.id}`;
    const browserScan = await runBrowserScan({
      rootUrl: jobData.rootUrl,
      config: jobData.config,
      outputPath,
    });

    const policyLinks = discoverPolicyLinks(browserScan.homepageHtml, jobData.rootUrl).slice(0, 2);
    const policyPages = [];

    for (const link of policyLinks) {
      try {
        const html = await fetchPageHtml(link.url);
        policyPages.push({
          type: link.type,
          url: link.url,
          extracted: extractPolicySummary(html),
        });
      } catch (error) {
        logger.warn({ scanId: jobData.id, url: link.url, error }, 'Policy page extraction failed');
      }
    }

    const baselineRow = await loadLatestCompletedScan(jobData.projectId, jobData.id);
    const startedAt = new Date().toISOString();
    const provisional = toCompletedScanFromStored({
      scanId: jobData.id,
      projectId: jobData.projectId,
      rootUrl: jobData.rootUrl,
      pages: browserScan.pages,
      policies: policyPages,
      findings: [],
      scores: {
        overall: 100,
        preConsentBehavior: 100,
        consentUx: 100,
        runtimeBlockingEffectiveness: 100,
        policyRuntimeAlignment: 100,
        regressionStability: 100,
      },
      riskLevel: 'low',
      diff: null,
      startedAt,
      finishedAt: new Date().toISOString(),
    });

    const initialFindings = evaluateRules({
      scanId: jobData.id,
      pages: browserScan.pages,
      policies: policyPages,
      diff: null,
    });
    const baseline = baselineRow ? await loadCompletedScan(baselineRow.id) : null;
    const diff = buildDiffSummary({ ...provisional, findings: initialFindings }, baseline);
    const findings = evaluateRules({
      scanId: jobData.id,
      pages: browserScan.pages,
      policies: policyPages,
      diff,
    });
    const scores = calculateScores(findings);
    const report = {
      ...provisional,
      findings,
      scores,
      riskLevel: riskLevelFromScore(scores.overall),
      diff,
      finishedAt: new Date().toISOString(),
    };

    await persistCompletedScan(report, baselineRow?.id ?? null);
    return { scanId: jobData.id };
  } catch (error) {
    await markScanFailed(jobData.id, error instanceof Error ? error.message : 'Unknown scan failure');
    throw error;
  }
}

export async function startWorker() {
  const config = getWorkerConfig();
  const connection = new IORedis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker<ScanJob>(
    scanQueueName,
    async (job) => processScanJob(job.data),
    {
      concurrency: config.WORKER_CONCURRENCY,
      connection,
    },
  );

  worker.on('failed', (job, error) => {
    logger.error({ scanId: job?.data.id, error }, 'Scan job failed');
  });

  worker.on('completed', (job) => {
    logger.info({ scanId: job.data.id }, 'Scan job completed');
  });

  logger.info('Worker service ready to process scan jobs from queue');
  return worker;
}