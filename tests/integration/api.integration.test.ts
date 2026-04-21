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

  it('accepts project root URLs without an explicit scheme', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/projects',
      payload: {
        name: 'Example',
        rootUrl: 'example.com/privacy',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json<{ rootUrl: string }>().rootUrl).toBe('https://example.com/privacy');
  });

  it('returns client errors for invalid project input and unknown scans', async () => {
    const invalidProjectResponse = await server.inject({
      method: 'POST',
      url: '/projects',
      payload: {
        name: 'Invalid',
        rootUrl: 'ftp://bad',
      },
    });

    expect(invalidProjectResponse.statusCode).toBe(400);
    expect(invalidProjectResponse.json<{ message: string }>().message).toBe('Invalid request');

    const scanResponse = await server.inject({
      method: 'POST',
      url: '/projects/project_missing/scans',
      payload: {},
    });

    expect(scanResponse.statusCode).toBe(404);
    expect(scanResponse.json<{ message: string }>().message).toBe('Project not found');
  });

  it('lists privacy-dependent trackers for a scan', async () => {
    const projectResponse = await server.inject({
      method: 'POST',
      url: '/projects',
      payload: {
        name: 'Tracker Listing',
        rootUrl: 'http://127.0.0.1:3000/compliant/',
      },
    });

    expect(projectResponse.statusCode).toBe(201);
    const project = projectResponse.json<{ id: string }>();

    const scanResponse = await server.inject({
      method: 'POST',
      url: `/projects/${project.id}/scans`,
      payload: {},
    });

    expect(scanResponse.statusCode).toBe(201);
    const scan = scanResponse.json<{ id: string }>();

    const trackersResponse = await server.inject({
      method: 'GET',
      url: `/scans/${scan.id}/privacy-dependent-trackers`,
    });

    expect(trackersResponse.statusCode).toBe(200);
    expect(trackersResponse.json()).toEqual([]);
  });
});
