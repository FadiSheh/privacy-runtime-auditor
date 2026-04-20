import { sql } from 'drizzle-orm';

export const migrations = [
  {
    id: '0001_init',
    sql: `
      CREATE TABLE IF NOT EXISTS _pra_migrations (
        id TEXT PRIMARY KEY,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        name TEXT NOT NULL,
        root_url TEXT NOT NULL,
        default_locale TEXT NOT NULL,
        default_region TEXT NOT NULL,
        config_json JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );

      CREATE TABLE IF NOT EXISTS scans (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        status TEXT NOT NULL,
        triggered_by_user_id TEXT,
        started_at TIMESTAMPTZ,
        finished_at TIMESTAMPTZ,
        overall_score INTEGER,
        risk_level TEXT,
        config_json JSONB NOT NULL
      );

      CREATE TABLE IF NOT EXISTS scan_pages (
        id TEXT PRIMARY KEY,
        scan_id TEXT NOT NULL,
        url TEXT NOT NULL,
        normalized_url TEXT NOT NULL,
        page_kind TEXT NOT NULL,
        status TEXT NOT NULL,
        screenshot_path TEXT,
        created_at TIMESTAMPTZ NOT NULL
      );

      CREATE TABLE IF NOT EXISTS scenarios (
        id TEXT PRIMARY KEY,
        scan_page_id TEXT NOT NULL,
        scenario_type TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TIMESTAMPTZ,
        finished_at TIMESTAMPTZ,
        metadata_json JSONB NOT NULL
      );

      CREATE TABLE IF NOT EXISTS observations (
        id TEXT PRIMARY KEY,
        scenario_id TEXT NOT NULL,
        artifact_type TEXT NOT NULL,
        name TEXT,
        domain TEXT,
        url TEXT,
        vendor_id TEXT,
        category TEXT,
        first_party BOOLEAN,
        confidence INTEGER,
        timestamp_offset_ms INTEGER,
        raw_json JSONB NOT NULL
      );

      CREATE TABLE IF NOT EXISTS findings (
        id TEXT PRIMARY KEY,
        scan_id TEXT NOT NULL,
        rule_code TEXT NOT NULL,
        severity TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        description TEXT NOT NULL,
        remediation TEXT NOT NULL,
        status TEXT NOT NULL,
        score_impact INTEGER NOT NULL,
        evidence_json JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL
      );

      CREATE TABLE IF NOT EXISTS policies (
        id TEXT PRIMARY KEY,
        scan_id TEXT NOT NULL,
        policy_type TEXT NOT NULL,
        url TEXT NOT NULL,
        raw_text TEXT NOT NULL,
        extracted_json JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vendors (
        id TEXT PRIMARY KEY,
        canonical_name TEXT NOT NULL,
        aliases_json JSONB NOT NULL,
        domains_json JSONB NOT NULL,
        default_category TEXT NOT NULL,
        metadata_json JSONB NOT NULL
      );

      CREATE TABLE IF NOT EXISTS scan_diffs (
        id TEXT PRIMARY KEY,
        baseline_scan_id TEXT NOT NULL,
        compared_scan_id TEXT NOT NULL,
        diff_json JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL
      );

      CREATE TABLE IF NOT EXISTS artifacts (
        id TEXT PRIMARY KEY,
        scan_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        path TEXT NOT NULL,
        metadata_json JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_projects_org ON projects (organization_id);
      CREATE INDEX IF NOT EXISTS idx_scans_project ON scans (project_id);
      CREATE INDEX IF NOT EXISTS idx_scan_pages_scan ON scan_pages (scan_id);
      CREATE INDEX IF NOT EXISTS idx_scenarios_page ON scenarios (scan_page_id);
      CREATE INDEX IF NOT EXISTS idx_observations_scenario ON observations (scenario_id);
      CREATE INDEX IF NOT EXISTS idx_findings_scan ON findings (scan_id);
      CREATE INDEX IF NOT EXISTS idx_policies_scan ON policies (scan_id);
      CREATE INDEX IF NOT EXISTS idx_artifacts_scan ON artifacts (scan_id);
    `,
  },
] as const;
export async function runMigrations(executor: { execute: (query: ReturnType<typeof sql.raw>) => Promise<unknown> }) {
  for (const migration of migrations) {
    const statements = migration.sql
      .split(';')
      .map((statement) => statement.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await executor.execute(sql.raw(statement));
    }
  }
}
