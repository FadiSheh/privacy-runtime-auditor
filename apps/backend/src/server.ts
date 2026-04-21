import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { migrations } from '@pra/db';
import { renderPdfReport } from '@pra/report-generator';
import { createLogger, normalizeUrl } from '@pra/utils';

import { getConfig } from './config';
import { pingDatabase } from './lib/database';
import { listProjects, createProject, getProjectById, updateProject, deleteProject } from './lib/projects';
import { buildCompletedScanReport, buildJsonReport, buildPrivacyDependentTrackerList } from './lib/reports';
import {
  createScan,
  getScan,
  getScanDiff,
  getScanFindings,
  getScanPages,
  getScanPolicies,
  getScanStatus,
  listProjectScans,
  setBaseline,
  cancelScan,
} from './lib/scans';
import { listVendors } from './lib/vendors';

const logger = createLogger('pra-api');

const rootUrlSchema = z.string().trim().min(1).transform((value, context) => {
  try {
    return normalizeUrl(value);
  } catch {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Invalid root URL',
    });
    return z.NEVER;
  }
});

const projectInputSchema = z.object({
  name: z.string().min(1),
  rootUrl: rootUrlSchema,
  defaultLocale: z.string().optional(),
  defaultRegion: z.string().optional(),
  config: z.unknown().optional(),
});

export async function buildServer() {
  const app = Fastify({
    loggerInstance: logger,
  });

  await app.register(cors, { origin: true });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  app.get('/health', async () => {
    await pingDatabase();
    return {
      status: 'ok',
      service: 'pra-api',
      migrations: migrations.map((item) => item.id),
    };
  });

  app.get('/projects', async () => listProjects());
  app.post('/projects', async (request, reply) => {
    const typedRequest = request as FastifyRequest<{ Body: unknown }>;
    const typedReply = reply as FastifyReply;
    const input = projectInputSchema.parse(typedRequest.body);
    const project = await createProject(input);
    typedReply.code(201);
    return project;
  });

  app.get('/projects/:id', async (request, reply) => {
    const typedRequest = request as FastifyRequest<{ Params: { id: string } }>;
    const typedReply = reply as FastifyReply;
    const params = z.object({ id: z.string() }).parse(typedRequest.params);
    const project = await getProjectById(params.id);

    if (!project) {
      typedReply.code(404);
      return { message: 'Project not found' };
    }

    return project;
  });

  app.patch('/projects/:id', async (request, reply) => {
    const typedRequest = request as FastifyRequest<{ Params: { id: string }; Body: unknown }>;
    const typedReply = reply as FastifyReply;
    const params = z.object({ id: z.string() }).parse(typedRequest.params);
    const input = projectInputSchema.partial().parse(typedRequest.body);
    const project = await updateProject(params.id, input);

    if (!project) {
      typedReply.code(404);
      return { message: 'Project not found' };
    }

    return project;
  });

  app.delete('/projects/:id', async (request, reply) => {
    const typedRequest = request as FastifyRequest<{ Params: { id: string } }>;
    const typedReply = reply as FastifyReply;
    const params = z.object({ id: z.string() }).parse(typedRequest.params);
    await deleteProject(params.id);
    typedReply.code(204);
    return null;
  });

  app.post('/projects/:id/scans', async (request, reply) => {
    const typedRequest = request as FastifyRequest<{ Params: { id: string }; Body: unknown }>;
    const typedReply = reply as FastifyReply;
    const params = z.object({ id: z.string() }).parse(typedRequest.params);
    const scan = await createScan(params.id);
    typedReply.code(201);
    return scan;
  });

  app.get('/projects/:id/scans', async (request) => {
    const typedRequest = request as FastifyRequest<{ Params: { id: string } }>;
    const params = z.object({ id: z.string() }).parse(typedRequest.params);
    return listProjectScans(params.id);
  });

  app.get('/scans/:id', async (request, reply) => {
    const typedRequest = request as FastifyRequest<{ Params: { id: string } }>;
    const typedReply = reply as FastifyReply;
    const params = z.object({ id: z.string() }).parse(typedRequest.params);
    const scan = await getScan(params.id);

    if (!scan) {
      typedReply.code(404);
      return { message: 'Scan not found' };
    }

    return scan;
  });

  app.get('/scans/:id/status', async (request, reply) => {
    const typedRequest = request as FastifyRequest<{ Params: { id: string } }>;
    const typedReply = reply as FastifyReply;
    const params = z.object({ id: z.string() }).parse(typedRequest.params);
    const status = await getScanStatus(params.id);

    if (!status) {
      typedReply.code(404);
      return { message: 'Scan not found' };
    }

    return status;
  });

  app.get('/scans/:id/findings', async (request) => {
    const typedRequest = request as FastifyRequest<{ Params: { id: string } }>;
    const params = z.object({ id: z.string() }).parse(typedRequest.params);
    return getScanFindings(params.id);
  });

  app.get('/scans/:id/pages', async (request) => {
    const typedRequest = request as FastifyRequest<{ Params: { id: string } }>;
    const params = z.object({ id: z.string() }).parse(typedRequest.params);
    return getScanPages(params.id);
  });

  app.get('/scans/:id/policies', async (request) => {
    const typedRequest = request as FastifyRequest<{ Params: { id: string } }>;
    const params = z.object({ id: z.string() }).parse(typedRequest.params);
    return getScanPolicies(params.id);
  });

  app.get('/scans/:id/privacy-dependent-trackers', async (request) => {
    const typedRequest = request as FastifyRequest<{ Params: { id: string } }>;
    const params = z.object({ id: z.string() }).parse(typedRequest.params);
    return buildPrivacyDependentTrackerList(params.id);
  });

  app.get('/scans/:id/report.json', async (request) => {
    const typedRequest = request as FastifyRequest<{ Params: { id: string } }>;
    const params = z.object({ id: z.string() }).parse(typedRequest.params);
    return buildJsonReport(params.id);
  });

  app.get('/scans/:id/report.pdf', async (request, reply) => {
    const typedRequest = request as FastifyRequest<{ Params: { id: string } }>;
    const typedReply = reply as FastifyReply;
    const params = z.object({ id: z.string() }).parse(typedRequest.params);
    const report = await buildCompletedScanReport(params.id);
    const pdf = await renderPdfReport(report);
    typedReply.header('content-type', pdf.contentType);
    typedReply.header('content-disposition', `attachment; filename="${pdf.filename}"`);
    return pdf.buffer;
  });

  app.get('/scans/:id/diff', async (request) => {
    const typedRequest = request as FastifyRequest<{ Params: { id: string } }>;
    const params = z.object({ id: z.string() }).parse(typedRequest.params);
    return getScanDiff(params.id);
  });

  app.post('/scans/:id/set-baseline', async (request) => {
    const typedRequest = request as FastifyRequest<{ Params: { id: string } }>;
    const params = z.object({ id: z.string() }).parse(typedRequest.params);
    return setBaseline(params.id);
  });

  app.post('/scans/:id/cancel', async (request, reply) => {
    const typedRequest = request as FastifyRequest<{ Params: { id: string } }>;
    const typedReply = reply as FastifyReply;
    const params = z.object({ id: z.string() }).parse(typedRequest.params);
    const result = await cancelScan(params.id);
    if (!result) {
      typedReply.code(404);
      return { message: 'Scan not found' };
    }
    return result;
  });

  app.get('/vendors', async () => listVendors());
  app.post('/vendors', async (_request, reply) => {
    const typedReply = reply as FastifyReply;
    typedReply.code(501);
    return { message: 'Vendor mutation is not yet implemented in MVP API.' };
  });
  app.patch('/vendors/:id', async (_request, reply) => {
    const typedReply = reply as FastifyReply;
    typedReply.code(501);
    return { message: 'Vendor mutation is not yet implemented in MVP API.' };
  });

  return app;
}
