export interface ScanJob {
  id: string;
  projectId: string;
  rootUrl: string;
  scenarios: ScanScenario[];
}

export interface ScanScenario {
  name: 'no-consent' | 'accept-all' | 'reject-all' | 'granular';
  description: string;
}

export interface Finding {
  id: string;
  scanId: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  evidence: Evidence[];
}

export interface Evidence {
  type: 'cookie' | 'request' | 'script' | 'storage' | 'screenshot';
  data: Record<string, unknown>;
  timestamp: Date;
}
