import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { Pool } from 'pg';

import * as schema from './schema';

export type NodeDatabase = ReturnType<typeof drizzlePg<typeof schema>>;
export type MemoryDatabase = ReturnType<typeof drizzlePglite<typeof schema>>;

export async function createNodeDatabase(connectionString: string) {
  const pool = new Pool({ connectionString });
  return {
    pool,
    db: drizzlePg(pool, { schema }),
  };
}

export async function createMemoryDatabase() {
  const client = new PGlite();
  return {
    client,
    db: drizzlePglite(client, { schema }),
  };
}