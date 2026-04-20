import { vendors } from '@pra/db';

import { getDatabase } from './database';

export async function listVendors() {
  const { db } = await getDatabase();
  return db.select().from(vendors);
}