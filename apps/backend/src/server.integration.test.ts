import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createMemoryDatabase, runMigrations } from '@pra/db';

describe('api foundation', () => {
  let database: Awaited<ReturnType<typeof createMemoryDatabase>>;

  beforeAll(async () => {
    database = await createMemoryDatabase();
    await runMigrations(database.db);
  });

  afterAll(async () => {
    await database.client.close();
  });

  it('initializes the in-memory database', async () => {
    const result = await database.db.execute(sql`SELECT to_regclass('public.scans') AS scans_table`);
    expect(result.rows[0]?.scans_table).toBe('scans');
  });
});