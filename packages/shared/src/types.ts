import { z } from 'zod';

export const scenarioTypeSchema = z.enum(['no-consent', 'accept-all', 'reject-all', 'granular']);
export type ScenarioType = z.infer<typeof scenarioTypeSchema>;

export const severitySchema = z.enum(['critical', 'high', 'medium', 'low', 'info']);
export type Severity = z.infer<typeof severitySchema>;

export const vendorCategorySchema = z.enum([
  'essential',
  'analytics',
  'advertising',
  'marketing',
  'social',
  'functional',
  'unknown',
]);
export type VendorCategory = z.infer<typeof vendorCategorySchema>;

export const scanStatusSchema = z.enum(['queued', 'running', 'completed', 'failed']);
export type ScanStatus = z.infer<typeof scanStatusSchema>;

export const evidenceTypeSchema = z.enum([
  'screenshot',
  'request',
  'cookie',
  'storage',
  'script',
  'iframe',
  'dom-snippet',
  'policy-excerpt',
  'scenario-metadata',
]);
export type EvidenceType = z.infer<typeof evidenceTypeSchema>;

export const artifactTypeSchema = z.enum([
  'request',
  'cookie',
  'local-storage',
  'session-storage',
  'indexed-db',
  'script',
  'iframe',
  'browser-api',
  'event-listener',
]);
export type ArtifactType = z.infer<typeof artifactTypeSchema>;

export const pageKindSchema = z.enum([
  'homepage',
  'category',
  'product',
  'article',
  'about',
  'contact',
  'checkout',
  'legal',
  'other',
]);
export type PageKind = z.infer<typeof pageKindSchema>;

export const riskLevelSchema = z.enum(['low', 'moderate', 'elevated', 'high']);
export type RiskLevel = z.infer<typeof riskLevelSchema>;

export const scoreBreakdownSchema = z.object({
  overall: z.number(),
  preConsentBehavior: z.number(),
  consentUx: z.number(),
  runtimeBlockingEffectiveness: z.number(),
  policyRuntimeAlignment: z.number(),
  regressionStability: z.number(),
});
export type ScoreBreakdown = z.infer<typeof scoreBreakdownSchema>;

export const scanConfigSchema = z.object({
  maxPages: z.number().int().positive().max(15).default(10),
  scanTimeoutMs: z.number().int().positive().default(90000),
  locale: z.string().default('en'),
  region: z.string().default('eu'),
  userAgentProfile: z.string().default('desktop-chrome'),
  preActionWaitMs: z.number().int().nonnegative().default(3000),
  postActionWaitMs: z.number().int().nonnegative().default(4000),
  allowedSubdomains: z.array(z.string()).default([]),
  includeUrlPatterns: z.array(z.string()).default([]),
  excludeUrlPatterns: z.array(z.string()).default([]),
});
export type ScanConfig = z.infer<typeof scanConfigSchema>;

export const projectSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  rootUrl: z.string().url(),
  defaultLocale: z.string(),
  defaultRegion: z.string(),
  scanConfig: scanConfigSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Project = z.infer<typeof projectSchema>;

export const observationSchema = z.object({
  id: z.string(),
  scenarioId: z.string(),
  artifactType: artifactTypeSchema,
  name: z.string().nullable(),
  domain: z.string().nullable(),
  url: z.string().nullable(),
  vendorId: z.string().nullable(),
  category: vendorCategorySchema.nullable(),
  firstParty: z.boolean().nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  timestampOffsetMs: z.number().int().nullable(),
  raw: z.record(z.string(), z.unknown()),
});
export type Observation = z.infer<typeof observationSchema>;

export const evidenceSchema = z.object({
  type: evidenceTypeSchema,
  label: z.string(),
  artifactId: z.string().nullable().optional(),
  path: z.string().nullable().optional(),
  data: z.record(z.string(), z.unknown()).default({}),
});
export type Evidence = z.infer<typeof evidenceSchema>;

export const findingSchema = z.object({
  id: z.string(),
  scanId: z.string(),
  ruleCode: z.string(),
  severity: severitySchema,
  title: z.string(),
  summary: z.string(),
  description: z.string(),
  remediation: z.string(),
  status: z.enum(['open', 'resolved', 'accepted']).default('open'),
  scoreImpact: z.number(),
  evidence: z.array(evidenceSchema),
});
export type Finding = z.infer<typeof findingSchema>;

export const vendorRegistryEntrySchema = z.object({
  id: z.string(),
  canonicalName: z.string(),
  aliases: z.array(z.string()),
  domains: z.array(z.string()),
  defaultCategory: vendorCategorySchema,
  notes: z.string().default(''),
  confidenceRules: z.array(z.string()).default([]),
});
export type VendorRegistryEntry = z.infer<typeof vendorRegistryEntrySchema>;

export const policyExtractSchema = z.object({
  headings: z.array(z.string()),
  rawText: z.string(),
  vendors: z.array(z.string()),
  categories: z.array(z.string()),
  purposes: z.array(z.string()),
  retentionStatements: z.array(z.string()),
  consentStatements: z.array(z.string()),
});
export type PolicyExtract = z.infer<typeof policyExtractSchema>;

export const scanScenarioSchema = z.object({
  id: z.string(),
  scanPageId: z.string(),
  scenarioType: scenarioTypeSchema,
  status: z.enum(['pending', 'running', 'completed', 'failed', 'skipped']),
  metadata: z.record(z.string(), z.unknown()),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
});
export type ScanScenario = z.infer<typeof scanScenarioSchema>;

export const scanJobSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  rootUrl: z.string().url(),
  config: scanConfigSchema,
  baselineScanId: z.string().nullable().optional(),
});
export type ScanJob = z.infer<typeof scanJobSchema>;

export const consentActionSchema = z.enum(['none', 'accept-all', 'reject-all', 'open-preferences', 'save-preferences']);
export type ConsentAction = z.infer<typeof consentActionSchema>;

export const consentUiDetectionSchema = z.object({
  present: z.boolean(),
  cmpVendor: z.string().nullable(),
  rejectVisible: z.boolean(),
  granularControlsPresent: z.boolean(),
  bannerText: z.string(),
  htmlSnippet: z.string(),
  buttons: z.array(
    z.object({
      label: z.string(),
      action: consentActionSchema,
      selector: z.string(),
    }),
  ),
  limitations: z.array(z.string()),
});
export type ConsentUiDetection = z.infer<typeof consentUiDetectionSchema>;

export const runtimeArtifactSchema = z.object({
  id: z.string(),
  artifactType: artifactTypeSchema,
  name: z.string().nullable(),
  domain: z.string().nullable(),
  url: z.string().nullable(),
  vendorId: z.string().nullable(),
  vendorName: z.string().nullable(),
  category: vendorCategorySchema.nullable(),
  firstParty: z.boolean().nullable(),
  confidence: z.number().nullable(),
  timestampOffsetMs: z.number().int().nullable(),
  raw: z.record(z.string(), z.unknown()),
});
export type RuntimeArtifact = z.infer<typeof runtimeArtifactSchema>;

export const privacyDependentTrackerSchema = z.object({
  pageUrl: z.string().url(),
  pageKind: pageKindSchema,
  trackerKey: z.string(),
  trackerLabel: z.string(),
  vendorName: z.string().nullable(),
  domain: z.string().nullable(),
  category: vendorCategorySchema,
  activeScenarios: z.array(scenarioTypeSchema),
  inactiveScenarios: z.array(scenarioTypeSchema),
  artifactTypes: z.array(artifactTypeSchema),
  evidenceArtifactIds: z.array(z.string()),
});
export type PrivacyDependentTracker = z.infer<typeof privacyDependentTrackerSchema>;

export const privacySignalCheckSchema = z.object({
  detected: z.boolean(),
  summary: z.string(),
  count: z.number().int().nonnegative().default(0),
  entities: z.array(z.string()).default([]),
  evidence: z.array(z.string()).default([]),
});
export type PrivacySignalCheck = z.infer<typeof privacySignalCheckSchema>;

export const privacySignalsSummarySchema = z.object({
  adTrackers: privacySignalCheckSchema,
  thirdPartyCookies: privacySignalCheckSchema,
  cookieBlockerEvasion: privacySignalCheckSchema,
  canvasFingerprinting: privacySignalCheckSchema,
  sessionRecorders: privacySignalCheckSchema,
  keystrokeCapture: privacySignalCheckSchema,
  facebookPixel: privacySignalCheckSchema,
  tiktokPixel: privacySignalCheckSchema,
  xPixel: privacySignalCheckSchema,
  googleAnalyticsRemarketing: privacySignalCheckSchema,
});
export type PrivacySignalsSummary = z.infer<typeof privacySignalsSummarySchema>;

export const scenarioScanResultSchema = z.object({
  scenarioType: scenarioTypeSchema,
  status: z.enum(['completed', 'failed', 'skipped']),
  consent: consentUiDetectionSchema,
  artifacts: z.array(runtimeArtifactSchema),
  screenshotPath: z.string().nullable(),
  bannerScreenshotPath: z.string().nullable(),
  domEvidence: z.array(z.string()),
  errorMessage: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
});
export type ScenarioScanResult = z.infer<typeof scenarioScanResultSchema>;

export const policyPageSchema = z.object({
  type: z.enum(['privacy', 'cookie']),
  url: z.string().url(),
  extracted: policyExtractSchema,
});
export type PolicyPage = z.infer<typeof policyPageSchema>;

export const pageScanResultSchema = z.object({
  url: z.string().url(),
  normalizedUrl: z.string().url(),
  pageKind: pageKindSchema,
  scenarioResults: z.array(scenarioScanResultSchema),
});
export type PageScanResult = z.infer<typeof pageScanResultSchema>;

export const scanDiffSummarySchema = z.object({
  newVendors: z.array(z.string()),
  newCookies: z.array(z.string()),
  newFailures: z.array(z.string()),
  resolvedFindings: z.array(z.string()),
});
export type ScanDiffSummary = z.infer<typeof scanDiffSummarySchema>;

export const completedScanSchema = z.object({
  scanId: z.string(),
  projectId: z.string(),
  rootUrl: z.string().url(),
  startedAt: z.string(),
  finishedAt: z.string(),
  pages: z.array(pageScanResultSchema),
  policies: z.array(policyPageSchema),
  findings: z.array(findingSchema),
  scores: scoreBreakdownSchema,
  riskLevel: riskLevelSchema,
  diff: scanDiffSummarySchema.nullable(),
  privacyDependentTrackers: z.array(privacyDependentTrackerSchema).default([]),
  privacySignals: privacySignalsSummarySchema,
  limitations: z.array(z.string()),
});
export type CompletedScan = z.infer<typeof completedScanSchema>;
