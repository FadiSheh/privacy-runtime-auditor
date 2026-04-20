import { runMigrations } from '@pra/db';

import { getDatabase } from './lib/database';

async function run() {
  const { db, dispose } = await getDatabase();

  try {
    await runMigrations(db);
  } finally {
    await dispose();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
