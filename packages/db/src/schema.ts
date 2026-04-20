import { boolean, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const organizations = pgTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  name: text('name').notNull(),
  rootUrl: text('root_url').notNull(),
  defaultLocale: text('default_locale').notNull(),
  defaultRegion: text('default_region').notNull(),
  configJson: jsonb('config_json').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

export const scans = pgTable('scans', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  status: text('status').notNull(),
  triggeredByUserId: text('triggered_by_user_id'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  overallScore: integer('overall_score'),
  riskLevel: text('risk_level'),
  configJson: jsonb('config_json').notNull(),
});

export const scanPages = pgTable('scan_pages', {
  id: text('id').primaryKey(),
  scanId: text('scan_id').notNull(),
  url: text('url').notNull(),
  normalizedUrl: text('normalized_url').notNull(),
  pageKind: text('page_kind').notNull(),
  status: text('status').notNull(),
  screenshotPath: text('screenshot_path'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

export const scenarios = pgTable('scenarios', {
  id: text('id').primaryKey(),
  scanPageId: text('scan_page_id').notNull(),
  scenarioType: text('scenario_type').notNull(),
  status: text('status').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  metadataJson: jsonb('metadata_json').notNull(),
});

export const observations = pgTable('observations', {
  id: text('id').primaryKey(),
  scenarioId: text('scenario_id').notNull(),
  artifactType: text('artifact_type').notNull(),
  name: text('name'),
  domain: text('domain'),
  url: text('url'),
  vendorId: text('vendor_id'),
  category: text('category'),
  firstParty: boolean('first_party'),
  confidence: integer('confidence'),
  timestampOffsetMs: integer('timestamp_offset_ms'),
  rawJson: jsonb('raw_json').notNull(),
});

export const findings = pgTable('findings', {
  id: text('id').primaryKey(),
  scanId: text('scan_id').notNull(),
  ruleCode: text('rule_code').notNull(),
  severity: text('severity').notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  description: text('description').notNull(),
  remediation: text('remediation').notNull(),
  status: text('status').notNull(),
  scoreImpact: integer('score_impact').notNull(),
  evidenceJson: jsonb('evidence_json').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

export const policies = pgTable('policies', {
  id: text('id').primaryKey(),
  scanId: text('scan_id').notNull(),
  policyType: text('policy_type').notNull(),
  url: text('url').notNull(),
  rawText: text('raw_text').notNull(),
  extractedJson: jsonb('extracted_json').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

export const vendors = pgTable('vendors', {
  id: text('id').primaryKey(),
  canonicalName: text('canonical_name').notNull(),
  aliasesJson: jsonb('aliases_json').notNull(),
  domainsJson: jsonb('domains_json').notNull(),
  defaultCategory: text('default_category').notNull(),
  metadataJson: jsonb('metadata_json').notNull(),
});

export const scanDiffs = pgTable('scan_diffs', {
  id: text('id').primaryKey(),
  baselineScanId: text('baseline_scan_id').notNull(),
  comparedScanId: text('compared_scan_id').notNull(),
  diffJson: jsonb('diff_json').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

export const artifacts = pgTable('artifacts', {
  id: text('id').primaryKey(),
  scanId: text('scan_id').notNull(),
  kind: text('kind').notNull(),
  path: text('path').notNull(),
  metadataJson: jsonb('metadata_json').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});