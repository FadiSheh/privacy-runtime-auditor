import { sql } from 'drizzle-orm';

import { createMemoryDatabase, createNodeDatabase, type MemoryDatabase, type NodeDatabase } from '@pra/db';

import { getConfig } from '../config';

type AnyDatabase = NodeDatabase | MemoryDatabase;

let cached: { db: AnyDatabase; dispose: () => Promise<void> } | null = null;

export async function getDatabase() {
  if (cached) {
    return cached;
  }

  if (getConfig().DATABASE_URL === 'memory') {
    const { db, client } = await createMemoryDatabase();
    cached = {
      db,
      dispose: async () => {
        await client.close();
        cached = null;
      },
    };
    return cached;
  }

  const { db, pool } = await createNodeDatabase(getConfig().DATABASE_URL);

  cached = {
    db,
    dispose: async () => {
      await pool.end();
      cached = null;
    },
  };

  return cached;
}

export async function pingDatabase() {
  const { db } = await getDatabase();
  await db.execute(sql`SELECT 1`);
}