import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { projects, runMigrations, scans } from '@pra/db';
import { scanConfigSchema } from '@pra/shared';

import { getDatabase } from '../../apps/worker/src/lib/database';
import { loadCompletedScan } from '../../apps/worker/src/lib/persist';
import { processScanJob } from '../../apps/worker/src/worker';
import { startFixtureServer, type FixtureServer } from '../helpers/fixture-site';

describe('worker scan orchestration', () => {
  let fixtureServer: FixtureServer;
  const storagePath = join(process.cwd(), 'tmp-test-artifacts');

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'memory';
    process.env.REDIS_URL = 'memory';
    process.env.ALLOW_PRIVATE_TARGETS = 'true';
    process.env.STORAGE_PATH = storagePath;

    await mkdir(storagePath, { recursive: true });
    fixtureServer = await startFixtureServer();

    const { db } = await getDatabase();
    await runMigrations(db);
  });

  afterAll(async () => {
    await fixtureServer.close();
    await rm(storagePath, { recursive: true, force: true });
    const database = await getDatabase();
    await database.dispose();
  });

  it('persists findings and a completed report for a non-compliant fixture', async () => {
    const { db } = await getDatabase();
    await db.insert(projects).values({
      id: 'project_fixture',
      organizationId: 'org_demo',
      name: 'Fixture project',
      rootUrl: `${fixtureServer.baseUrl}/missingBanner/`,
      defaultLocale: 'en',
      defaultRegion: 'eu',
      configJson: scanConfigSchema.parse({}),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await db.insert(scans).values({
      id: 'scan_fixture',
      projectId: 'project_fixture',
      status: 'queued',
      triggeredByUserId: null,
      startedAt: null,
      finishedAt: null,
      overallScore: null,
      riskLevel: null,
      configJson: scanConfigSchema.parse({}),
    });

    await processScanJob({
      id: 'scan_fixture',
      projectId: 'project_fixture',
      rootUrl: `${fixtureServer.baseUrl}/missingBanner/`,
      config: scanConfigSchema.parse({ maxPages: 4, preActionWaitMs: 50, postActionWaitMs: 50 }),
    });

    const report = await loadCompletedScan('scan_fixture');
    expect(report).not.toBeNull();
    expect(report?.pages.length).toBeGreaterThan(0);

    const ruleCodes = report?.findings.map((finding) => finding.ruleCode) ?? [];
    expect(ruleCodes).toContain('R001');
    expect(ruleCodes).toContain('R002');
  });
});
