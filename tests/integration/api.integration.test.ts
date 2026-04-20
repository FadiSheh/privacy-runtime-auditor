import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runMigrations } from '@pra/db';

import { getDatabase } from '../../apps/backend/src/lib/database';
import { buildServer } from '../../apps/backend/src/server';

describe('backend api integration', () => {
  let server: Awaited<ReturnType<typeof buildServer>>;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'memory';
    process.env.REDIS_URL = 'memory';
    process.env.ALLOW_PRIVATE_TARGETS = 'true';

    const { db } = await getDatabase();
    await runMigrations(db);

    server = await buildServer();
  });

  afterAll(async () => {
    await server?.close();
    const database = await getDatabase();
    await database.dispose();
  });

  it('creates projects and queues scans', async () => {
    const projectResponse = await server.inject({
      method: 'POST',
      url: '/projects',
      payload: {
        name: 'Fixture Site',
        rootUrl: 'http://127.0.0.1:3000/compliant/',
      },
    });

    expect(projectResponse.statusCode).toBe(201);
    const project = projectResponse.json<{ id: string }>();

    const listResponse = await server.inject({ method: 'GET', url: '/projects' });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json<Array<{ id: string }>>().some((entry) => entry.id === project.id)).toBe(true);

    const scanResponse = await server.inject({
      method: 'POST',
      url: `/projects/${project.id}/scans`,
      payload: {},
    });

    expect(scanResponse.statusCode).toBe(201);
    expect(scanResponse.json<{ status: string }>().status).toBe('queued');
  });
});
