import { desc, eq } from 'drizzle-orm';

import { projects, scans } from '@pra/db';
import { scanConfigSchema } from '@pra/shared';
import { assertSafeScanTarget, createId } from '@pra/utils';

import { getDatabase } from './database';

const defaultOrganizationId = 'org_demo';

export async function listProjects() {
  const { db } = await getDatabase();
  return db.select().from(projects).orderBy(desc(projects.createdAt));
}

export async function getProjectById(projectId: string) {
  const { db } = await getDatabase();
  const result = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  return result[0] ?? null;
}

export async function createProject(input: { name: string; rootUrl: string; defaultLocale?: string; defaultRegion?: string; config?: unknown }) {
  const { db } = await getDatabase();
  const now = new Date();
  const project = {
    id: createId('project'),
    organizationId: defaultOrganizationId,
    name: input.name,
    rootUrl: assertSafeScanTarget(input.rootUrl),
    defaultLocale: input.defaultLocale ?? 'en',
    defaultRegion: input.defaultRegion ?? 'eu',
    configJson: scanConfigSchema.parse(input.config ?? {}),
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(projects).values(project);
  return project;
}

export async function updateProject(projectId: string, input: Partial<{ name: string; rootUrl: string; defaultLocale: string; defaultRegion: string; config: unknown }>) {
  const { db } = await getDatabase();
  await db
    .update(projects)
    .set({
      ...(input.name ? { name: input.name } : {}),
      ...(input.rootUrl ? { rootUrl: assertSafeScanTarget(input.rootUrl) } : {}),
      ...(input.defaultLocale ? { defaultLocale: input.defaultLocale } : {}),
      ...(input.defaultRegion ? { defaultRegion: input.defaultRegion } : {}),
      ...(input.config ? { configJson: scanConfigSchema.parse(input.config) } : {}),
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId));

  return getProjectById(projectId);
}

export async function deleteProject(projectId: string) {
  const { db } = await getDatabase();
  await db.delete(scans).where(eq(scans.projectId, projectId));
  await db.delete(projects).where(eq(projects.id, projectId));
}