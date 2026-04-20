import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { createMemoryDatabase } from './client';
import { runMigrations } from './migrations';

describe('database migrations', () => {
  it('creates the expected schema', async () => {
    const { db } = await createMemoryDatabase();

    await runMigrations(db);

    const result = await db.execute(sql`SELECT to_regclass('public.projects') AS projects_table`);
    expect(result.rows[0]?.projects_table).toBe('projects');
  });
});