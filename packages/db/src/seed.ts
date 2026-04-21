import { eq } from 'drizzle-orm';

import type { AnyDatabase } from './client';
import { organizations, users, vendors } from './schema';
import { createId } from '@pra/utils';

export async function seedDatabase(db: AnyDatabase) {
  const now = new Date();
  const existingOrg = await db.select().from(organizations).limit(1);

  if (existingOrg.length === 0) {
    const organizationId = createId('org');
    const userId = createId('user');

    await db.insert(organizations).values({
      id: organizationId,
      name: 'Demo Organization',
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(users).values({
      id: userId,
      organizationId,
      email: 'demo@pra.local',
      passwordHash: '$2b$10$P8nRPGX84W0m1BdV6Jc4Eeq2a5B0M4m5j4sBf9x1xYk2VLGHnKwGa',
      role: 'admin',
      createdAt: now,
      updatedAt: now,
    });
  }

  const seedVendors = [
    {
      id: 'vendor_google_analytics',
      canonicalName: 'Google Analytics',
      aliasesJson: ['GA4', 'Google tag manager'],
      domainsJson: ['google-analytics.com', 'googletagmanager.com'],
      defaultCategory: 'analytics',
      metadataJson: { source: 'seed' },
    },
    {
      id: 'vendor_doubleclick',
      canonicalName: 'Google Ads / DoubleClick',
      aliasesJson: ['DoubleClick', 'Google Ads'],
      domainsJson: ['doubleclick.net', 'googleadservices.com'],
      defaultCategory: 'advertising',
      metadataJson: { source: 'seed' },
    },
    {
      id: 'vendor_meta',
      canonicalName: 'Meta',
      aliasesJson: ['Facebook', 'Meta Pixel'],
      domainsJson: ['facebook.net', 'connect.facebook.net', 'facebook.com'],
      defaultCategory: 'advertising',
      metadataJson: { source: 'seed' },
    },
  ] as const;

  for (const vendor of seedVendors) {
    const existing = await db.select().from(vendors).where(eq(vendors.id, vendor.id)).limit(1);

    if (existing.length === 0) {
      await db.insert(vendors).values(vendor);
    }
  }
}