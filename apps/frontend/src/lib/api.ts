const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export interface ProjectSummary {
  id: string;
  name: string;
  rootUrl: string;
  defaultLocale: string;
  defaultRegion: string;
  createdAt: string;
}

export interface ScanStatus {
  scanId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  pageCount: number;
  completedScenarios: number;
  totalScenarios: number;
  startedAt?: string;
  finishedAt?: string;
}

export interface FindingSummary {
  id: string;
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  summary: string;
  description: string;
  remediation: string;
  evidence: Array<{ label: string; type: string }>;
}

export interface ScanReport {
  scanId: string;
  projectId: string;
  rootUrl: string;
  startedAt: string;
  finishedAt: string;
  scores: {
    overall: number;
    preConsentBehavior: number;
    consentUx: number;
    runtimeBlockingEffectiveness: number;
    policyRuntimeAlignment: number;
    regressionStability: number;
  };
  riskLevel: string;
  findings: FindingSummary[];
  pages: Array<{
    url: string;
    pageKind: string;
    scenarioResults: Array<{
      scenarioType: string;
      status: string;
      screenshotPath: string | null;
      consent: {
        present: boolean;
        rejectVisible: boolean;
        granularControlsPresent: boolean;
        bannerText: string;
        limitations: string[];
      };
      artifacts: Array<{
        id: string;
        artifactType: string;
        vendorName: string | null;
        category: string | null;
        domain: string | null;
        url: string | null;
      }>;
    }>;
  }>;
  policies: Array<{
    type: 'privacy' | 'cookie';
    url: string;
    extracted: {
      vendors: string[];
      categories: string[];
      consentStatements: string[];
    };
  }>;
  diff: {
    newVendors: string[];
    newCookies: string[];
    newFailures: string[];
    resolvedFindings: string[];
  } | null;
  limitations: string[];
}

export async function fetchProjects() {
  return request<ProjectSummary[]>('/projects');
}

export async function createProject(input: { name: string; rootUrl: string }) {
  return request<ProjectSummary>('/projects', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function fetchProject(projectId: string) {
  return request<ProjectSummary>(`/projects/${projectId}`);
}

export async function fetchProjectScans(projectId: string) {
  return request<Array<{ id: string; status: string; startedAt: string | null; finishedAt: string | null; overallScore: number | null }>>(`/projects/${projectId}/scans`);
}

export async function startScan(projectId: string) {
  return request<{ id: string }>(`/projects/${projectId}/scans`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function fetchScanStatus(scanId: string) {
  return request<ScanStatus>(`/scans/${scanId}/status`);
}

export async function fetchScanReport(scanId: string) {
  return request<ScanReport>(`/scans/${scanId}/report.json`);
}

export async function fetchVendors() {
  return request<Array<{ id: string; canonicalName: string; defaultCategory: string }>>('/vendors');
}
