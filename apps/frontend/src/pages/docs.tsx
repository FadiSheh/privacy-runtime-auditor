import { Layout } from '../components/layout';
import { C, F } from '../lib/tokens';

function Section({ id, tag, title, children }: { id: string; tag: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: 56 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, borderBottom: `1px solid ${C.ink}`, paddingBottom: 10, marginBottom: 20 }}>
        <span style={{ fontFamily: F.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: C.slate60 }}>§ {tag}</span>
        <h2 style={{ fontFamily: F.serif, fontSize: 26, fontWeight: 500, margin: 0, letterSpacing: -0.4 }}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', gap: 16, padding: '8px 0', borderBottom: `1px solid ${C.hairline}` }}>
      <span style={{ fontFamily: F.mono, fontSize: 11, color: C.slate60, minWidth: 180, flexShrink: 0 }}>{k}</span>
      <span style={{ fontFamily: F.mono, fontSize: 11, color: C.ink }}>{v}</span>
    </div>
  );
}

function Callout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.paper, border: `1px solid ${C.hairline}`, padding: '16px 20px', marginBottom: 20 }}>
      <div style={{ fontFamily: F.mono, fontSize: 10, color: C.slate, letterSpacing: 1, marginBottom: 10, fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 13, color: C.ink70, lineHeight: 1.65 }}>{children}</div>
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre style={{ background: C.ink, color: C.sandDeeper, padding: 20, fontFamily: F.mono, fontSize: 12, lineHeight: 1.75, margin: 0, overflowX: 'auto' }}>
      {children}
    </pre>
  );
}

export default function DocsPage() {
  return (
    <Layout activeNav="docs">
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gridTemplateColumns: '220px 1fr', gap: 0 }}>
        <aside style={{
          padding: '48px 16px 48px 32px',
          borderRight: `1px solid ${C.hairline}`,
          position: 'sticky', top: 56, alignSelf: 'flex-start',
          height: 'calc(100vh - 56px)',
          overflow: 'hidden',
        }}>
          <div style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 600, letterSpacing: 1.5, color: C.slate, marginBottom: 12 }}>
            CONTENTS
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              ['overview', 'Overview', 'A'],
              ['model', 'Core model', 'B'],
              ['pipeline', 'Scan pipeline', 'C'],
              ['rules', 'Rules & findings', 'D'],
              ['scoring', 'Scoring', 'E'],
              ['api', 'API examples', 'F'],
              ['config', 'Configuration', 'G'],
              ['env', 'Environment', 'H'],
            ].map(([id, label, tag]) => (
              <a
                key={id}
                href={`#${id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 10px',
                  fontFamily: F.mono, fontSize: 12, color: C.slate,
                  textDecoration: 'none', letterSpacing: 0.3,
                  borderLeft: '2px solid transparent',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = C.ink; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = C.slate; }}
              >
                <span style={{ fontFamily: F.mono, fontSize: 10, color: C.slate60, fontWeight: 700 }}>{tag}</span>
                {label}
              </a>
            ))}
          </nav>
        </aside>

        <main style={{ padding: '48px 40px 96px', minWidth: 0, fontFamily: F.body }}>
          <div style={{ borderBottom: `1px solid ${C.hairline}`, paddingBottom: 24, marginBottom: 48 }}>
            <h1 style={{ fontFamily: F.serif, fontSize: 44, fontWeight: 500, margin: 0, color: C.ink, letterSpacing: -1, lineHeight: 1 }}>
              Documentation
            </h1>
            <p style={{ fontFamily: F.mono, fontSize: 11, color: C.slate, marginTop: 10, letterSpacing: 0.5 }}>
              Privacy Runtime Auditor · implementation guide and API reference
            </p>
          </div>

          <Section id="overview" tag="A" title="Overview">
            <p style={{ fontSize: 15, color: C.ink70, lineHeight: 1.7, maxWidth: 760, marginBottom: 20 }}>
              Privacy Runtime Auditor, or PRA, is a website scanner that compares what a site says about privacy with what the browser actually does.
              It creates a project for a website, queues scans, replays consent choices in Chromium, records runtime artifacts such as requests and cookies,
              evaluates deterministic privacy rules, and produces JSON and PDF reports.
            </p>
            <div style={{ background: C.paper, border: `1px solid ${C.hairline}`, padding: '16px 20px', marginBottom: 20 }}>
              <div style={{ fontFamily: F.mono, fontSize: 10, color: C.slate, letterSpacing: 1, marginBottom: 12, fontWeight: 600 }}>
                WHAT THE SYSTEM ACTUALLY DOES
              </div>
              {([
                ['Project', 'Stores a target root URL plus the default scan configuration used for new scans.'],
                ['Scan', 'Represents one queued or executed audit run for a single project.'],
                ['Discovery', 'Finds pages from links on the landing page only, limited by maxPages and allowedSubdomains.'],
                ['Scenarios', 'Runs four consent states per discovered page: no-consent, accept-all, reject-all, granular.'],
                ['Artifacts', 'Captures requests, cookies, local storage, session storage, IndexedDB, scripts, and iframes.'],
                ['Policies', 'Attempts to discover and parse up to two legal pages, typically privacy and cookie pages.'],
                ['Rules', 'Generates findings R001-R012 based on runtime behavior, policy mismatch, and baseline regressions.'],
                ['Reports', 'Exposes structured results through report.json and report.pdf endpoints.'],
              ] as Array<[string, string]>).map(([k, v]) => <KV key={k} k={k} v={v} />)}
            </div>
            <Callout title="EXAMPLE: ONE COMPLETE RUN">
              You create a project for https://shop.example.com, start a scan, PRA discovers the homepage plus product, contact, and policy links,
              runs four consent scenarios on each page, notices Google Analytics requests before consent and after reject-all, parses the privacy policy,
              and returns findings such as "Non-essential tracking before consent" and "Reject-all ineffective" together with screenshots, URLs, and vendor names.
            </Callout>
          </Section>

          <Section id="model" tag="B" title="Core model">
            <p style={{ fontSize: 14, color: C.slate, lineHeight: 1.65, maxWidth: 760, marginBottom: 20 }}>
              The easiest way to understand PRA is to follow its main objects. The frontend talks to the backend with a small REST API,
              and the worker turns a queued scan job into pages, scenarios, observations, findings, and a final report.
            </p>
            <div style={{ borderTop: `1px solid ${C.hairline}`, marginBottom: 24 }}>
              {[
                ['Project', 'A saved website target. Includes id, name, rootUrl, locale, region, and a default scan configuration.'],
                ['Scan', 'A single audit run for one project. User-facing statuses are queued, running, completed, failed, and cancelled.'],
                ['Page', 'A discovered URL with a page kind such as homepage, product, article, legal, or contact.'],
                ['Scenario', 'One consent state replayed on one page. Scenario status can complete, fail, or be skipped.'],
                ['Artifact', 'A runtime signal collected during a scenario, for example a cookie, request, script, iframe, or storage entry.'],
                ['Finding', 'A rule violation or informational regression item with severity, evidence, remediation, and score impact.'],
                ['Policy page', 'A parsed privacy or cookie page used to compare declarations against runtime observations.'],
                ['Diff', 'A comparison against the latest completed scan in the same project to detect new vendors or new failures.'],
              ].map(([n, body]) => (
                <div key={n} style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: 20, padding: '14px 0', borderBottom: `1px solid ${C.hairline}` }}>
                  <span style={{ fontFamily: F.mono, fontSize: 11, color: C.ink, fontWeight: 600 }}>{n}</span>
                  <span style={{ fontSize: 13, color: C.ink70, lineHeight: 1.6 }}>{body}</span>
                </div>
              ))}
            </div>
            <Callout title="EXAMPLE: PROJECT OBJECT">
              <CodeBlock>{`{
  "id": "project_8p4h0clihrokpnjv",
  "name": "E2E Test",
  "rootUrl": "https://www.google.com/",
  "defaultLocale": "en",
  "defaultRegion": "eu",
  "configJson": {
    "locale": "en",
    "region": "eu",
    "maxPages": 10,
    "scanTimeoutMs": 90000,
    "preActionWaitMs": 3000,
    "postActionWaitMs": 4000,
    "userAgentProfile": "desktop-chrome",
    "allowedSubdomains": [],
    "excludeUrlPatterns": [],
    "includeUrlPatterns": []
  }
}`}</CodeBlock>
            </Callout>
            <Callout title="EXAMPLE: LIVE SCAN STATUS">
              <CodeBlock>{`{
  "scanId": "scan_st2mc7hjpt276fum",
  "status": "running",
  "startedAt": "2026-04-21T13:20:19.618Z",
  "finishedAt": null,
  "progress": 50,
  "pageCount": 5,
  "completedScenarios": 20,
  "totalScenarios": 40
}`}</CodeBlock>
            </Callout>
          </Section>

          <Section id="pipeline" tag="C" title="Scan pipeline">
            <p style={{ fontSize: 14, color: C.slate, lineHeight: 1.65, marginBottom: 20, maxWidth: 760 }}>
              The pipeline below is based on the current backend and worker implementation. A few details matter for correct expectations:
              page discovery is shallow, scenarios run sequentially for each page, and cancellation is cooperative for running scans.
            </p>
            <div style={{ borderTop: `1px solid ${C.hairline}`, marginBottom: 24 }}>
              {[
                ['01', 'CREATE', 'POST /projects/:id/scans inserts a new scan row with status queued and pushes a BullMQ job using the scan id as jobId.'],
                ['02', 'DISCOVER', 'The browser-runner opens the root URL, waits briefly, extracts links from anchor tags on that page, keeps same-host or explicitly allowed subdomains, infers page kinds, and stops at maxPages. It does not recursively crawl the full site graph.'],
                ['03', 'STUB', 'As soon as discovery finishes, the worker creates page and scenario stub rows in the database so the frontend can show progress.'],
                ['04', 'SCENARIOS', 'For each discovered page PRA runs no-consent, accept-all, reject-all, and granular in that fixed order. Each scenario starts with a fresh browser context.'],
                ['05', 'CONSENT', 'Consent actions rely on DOM text heuristics such as Accept all, Reject all, Manage, Preferences, Save, Apply, and similar labels. If a required button is missing, that limitation is recorded in scenario metadata.'],
                ['06', 'CAPTURE', 'During each scenario PRA records network requests plus cookies, storage entries, scripts, and iframe evidence, then saves a full-page screenshot.'],
                ['07', 'POLICY', 'After runtime capture PRA tries to find policy links from the homepage HTML and fetches at most two pages for extraction: privacy and cookie.'],
                ['08', 'RULES', 'The rules engine evaluates runtime evidence, policy mismatches, and baseline differences to produce findings R001-R012.'],
                ['09', 'SCORE', 'Scores are derived from accumulated finding severity penalties, then mapped to a risk level: low, moderate, elevated, or high.'],
                ['10', 'REPORT', 'The worker persists pages, observations, policies, findings, diff data, and final scan summary. The API then serves report.json and report.pdf for completed scans.'],
                ['11', 'CANCEL', 'Queued scans can be removed from the queue immediately. Running scans are cancelled by a Redis flag that is checked between discovery and page completion callbacks, then the scan is marked cancelled.'],
              ].map(([n, phase, body]) => (
                <div key={n} style={{ display: 'grid', gridTemplateColumns: '32px 110px 1fr', gap: 20, padding: '16px 0', borderBottom: `1px solid ${C.hairline}`, alignItems: 'flex-start' }}>
                  <span style={{ fontFamily: F.mono, fontSize: 11, color: C.slate30, fontWeight: 600 }}>{n}</span>
                  <span style={{
                    fontFamily: F.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1,
                    color: C.slate60, border: `1px solid ${C.hairline}`, padding: '3px 8px',
                    display: 'inline-flex', alignItems: 'center', height: 22, width: 'fit-content',
                  }}>{phase}</span>
                  <span style={{ fontSize: 13, color: C.ink70, lineHeight: 1.6 }}>{body}</span>
                </div>
              ))}
            </div>
            <Callout title="EXAMPLE: WHAT 'GRANULAR' MEANS IN PRA">
              Granular is not a standards-based consent model. In the current runner it means PRA looks for a preferences flow, tries to open it,
              and attempts to save limited choices. If the CMP exposes no granular controls, the scenario still runs and records that limitation.
              That matters because R005 and R010 are partly about whether granular controls exist and whether they change runtime behavior.
            </Callout>
          </Section>

          <Section id="rules" tag="D" title="Rules and findings">
            <p style={{ fontSize: 14, color: C.slate, lineHeight: 1.65, marginBottom: 20, maxWidth: 760 }}>
              Findings are deterministic. PRA does not ask an LLM whether a site is compliant. It applies explicit rule code paths in the rules-engine package and attaches evidence slices from observed artifacts.
            </p>
            <div style={{ background: C.paper, border: `1px solid ${C.hairline}`, marginBottom: 24 }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '84px 90px 1fr',
                padding: '8px 16px', background: C.sandDeep,
                fontFamily: F.mono, fontSize: 9, letterSpacing: 1, color: C.slate, fontWeight: 600,
                borderBottom: `1px solid ${C.hairline}`,
              }}>
                <span>RULE</span>
                <span>SEVERITY</span>
                <span>WHAT IT CHECKS</span>
              </div>
              {[
                ['R001', 'high', 'Non-essential artifacts exist in the no-consent scenario.'],
                ['R002', 'critical', 'Non-essential tracking occurs and no consent interface is detected.'],
                ['R003', 'medium', 'Accept-all is available but reject-all is not visible on the first layer.'],
                ['R004', 'high', 'Reject-all still allows non-essential activity that was already present before consent.'],
                ['R005', 'high', 'Granular or functional-only choices do not reduce non-essential activity.'],
                ['R006', 'medium', 'Runtime vendors appear that are not disclosed in discovered policies.'],
                ['R007', 'medium', 'Observed runtime categories do not match categories disclosed in policy text.'],
                ['R008', 'medium', 'Consent UI shows accept-all more prominently than reject-all, creating dark-pattern risk.'],
                ['R009', 'high', 'Non-essential cookies are deposited before consent interaction.'],
                ['R010', 'low', 'Meaningful granular preference controls are missing or not detectable.'],
                ['R011', 'info', 'New vendors appear relative to the latest completed baseline scan.'],
                ['R012', 'medium', 'Rules that previously passed now fail relative to the latest completed baseline scan.'],
              ].map(([rule, sev, desc], i) => (
                <div key={rule} style={{ display: 'grid', gridTemplateColumns: '84px 90px 1fr', padding: '12px 16px', borderBottom: i === 11 ? 'none' : `1px solid ${C.hairline}` }}>
                  <span style={{ fontFamily: F.mono, fontSize: 11, color: C.ink, fontWeight: 700 }}>{rule}</span>
                  <span style={{ fontFamily: F.mono, fontSize: 11, color: C.slate }}>{sev}</span>
                  <span style={{ fontSize: 13, color: C.ink70, lineHeight: 1.5 }}>{desc}</span>
                </div>
              ))}
            </div>
            <Callout title="EXAMPLE: FINDING OBJECT">
              <CodeBlock>{`{
  "id": "finding_q4nl2d8g3m8m3k1p",
  "ruleCode": "R004",
  "severity": "high",
  "title": "Reject-all ineffective",
  "summary": "Reject-all did not prevent non-essential activity.",
  "description": "Non-essential artifacts remained after reject-all on https://shop.example.com/.",
  "remediation": "Ensure reject-all blocks non-essential tags, pixels, and storage writes.",
  "status": "open",
  "scoreImpact": 20,
  "evidence": [
    { "type": "request", "label": "https://www.google-analytics.com/g/collect" },
    { "type": "cookie", "label": "_ga" }
  ]
}`}</CodeBlock>
            </Callout>
          </Section>

          <Section id="scoring" tag="E" title="Scoring">
            <p style={{ fontSize: 14, color: C.slate, lineHeight: 1.65, marginBottom: 20, maxWidth: 760 }}>
              Scoring is intentionally simple in the current implementation. Each finding adds a penalty based on severity, the overall score becomes 100 minus total penalty,
              and the named dimension scores are scaled variants of the same penalty total. This means dimensions are not yet independently modeled from separate rule subsets.
            </p>
            <div style={{ background: C.paper, border: `1px solid ${C.hairline}`, marginBottom: 24 }}>
              {[
                ['critical', '30 penalty points'],
                ['high', '20 penalty points'],
                ['medium', '10 penalty points'],
                ['low', '5 penalty points'],
                ['info', '1 penalty point'],
              ].map(([k, v], i) => (
                <div key={k} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '12px 16px', borderBottom: i === 4 ? 'none' : `1px solid ${C.hairline}` }}>
                  <span style={{ fontFamily: F.mono, fontSize: 11, color: C.ink, fontWeight: 600 }}>{k}</span>
                  <span style={{ fontSize: 13, color: C.ink70 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: C.hairline, border: `1px solid ${C.hairline}`, marginBottom: 24 }}>
              {[
                ['≥ 85', '#2E7D32', '#D6E7D3', 'LOW', 'Strong current posture based on observed findings.'],
                ['65-84', '#8A5A13', '#F1E2C5', 'MODERATE', 'Some compliance issues are present but not catastrophic.'],
                ['40-64', '#C4601F', '#F4E1CF', 'ELEVATED', 'Multiple material issues require remediation.'],
                ['< 40', '#B73A2B', '#F4DAD4', 'HIGH', 'The scan accumulated severe or numerous findings.'],
              ].map(([range, col, bg, label, desc]) => (
                <div key={range} style={{ background: C.paper, padding: 20 }}>
                  <div style={{ fontFamily: F.mono, fontSize: 28, fontWeight: 500, color: col, lineHeight: 1, marginBottom: 8 }}>{range}</div>
                  <div style={{ fontFamily: F.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1, padding: '3px 8px', background: bg, color: col, display: 'inline-block', marginBottom: 10 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 12, color: C.ink70, lineHeight: 1.5 }}>{desc}</div>
                </div>
              ))}
            </div>
            <Callout title="EXAMPLE: SCORE CALCULATION">
              If a scan has one critical finding, two high findings, and one medium finding, the total penalty is 30 + 20 + 20 + 10 = 80.
              The overall score becomes 20, which maps to risk level high. The named dimensions are then derived from that same penalty total with small multipliers,
              so they will also be low.
            </Callout>
            <Callout title="EXAMPLE: REPORT SCORE BLOCK">
              <CodeBlock>{`{
  "scores": {
    "overall": 58,
    "preConsentBehavior": 58,
    "consentUx": 62,
    "runtimeBlockingEffectiveness": 54,
    "policyRuntimeAlignment": 66,
    "regressionStability": 71
  },
  "riskLevel": "elevated"
}`}</CodeBlock>
            </Callout>
          </Section>

          <Section id="api" tag="F" title="API examples">
            <p style={{ fontSize: 14, color: C.slate, lineHeight: 1.65, marginBottom: 20, maxWidth: 760 }}>
              These examples reflect the current backend routes. They are the simplest way to understand the external contract used by the frontend.
            </p>
            <div style={{ display: 'grid', gap: 20 }}>
              <Callout title="CREATE A PROJECT">
                <CodeBlock>{`curl -X POST http://localhost:3001/projects \\
  -H 'content-type: application/json' \\
  -d '{
    "name": "Marketing Site",
    "rootUrl": "https://example.com"
  }'`}</CodeBlock>
              </Callout>
              <Callout title="START A SCAN">
                <CodeBlock>{`curl -X POST http://localhost:3001/projects/project_123/scans \\
  -H 'content-type: application/json' \\
  -d '{}'`}</CodeBlock>
              </Callout>
              <Callout title="POLL STATUS">
                <CodeBlock>{`curl http://localhost:3001/scans/scan_123/status

{
  "scanId": "scan_123",
  "status": "running",
  "progress": 75,
  "pageCount": 6,
  "completedScenarios": 18,
  "totalScenarios": 24
}`}</CodeBlock>
              </Callout>
              <Callout title="CANCEL A SCAN">
                <CodeBlock>{`curl -X POST http://localhost:3001/scans/scan_123/cancel

{
  "scanId": "scan_123",
  "cancelled": true
}`}</CodeBlock>
              </Callout>
              <Callout title="FETCH THE FINAL REPORT">
                <CodeBlock>{`curl http://localhost:3001/scans/scan_123/report.json`}</CodeBlock>
              </Callout>
            </div>
          </Section>

          <Section id="config" tag="G" title="Configuration">
            <p style={{ fontSize: 14, color: C.slate, lineHeight: 1.65, marginBottom: 20, maxWidth: 760 }}>
              Each project stores a scan configuration object. New scans copy that configuration into the scan row and the worker uses it when running the browser automation.
            </p>
            <CodeBlock>{`{
  "maxPages": 10,
  "scanTimeoutMs": 90000,
  "locale": "en",
  "region": "eu",
  "userAgentProfile": "desktop-chrome",
  "preActionWaitMs": 3000,
  "postActionWaitMs": 4000,
  "allowedSubdomains": [],
  "includeUrlPatterns": [],
  "excludeUrlPatterns": []
}`}</CodeBlock>
            <div style={{ background: C.paper, border: `1px solid ${C.hairline}`, marginTop: 20 }}>
              {[
                ['maxPages', 'Maximum number of pages discovered from the landing page. Hard-capped at 15 by schema validation.'],
                ['scanTimeoutMs', 'Per-page navigation timeout used by Playwright.'],
                ['locale / region', 'Stored with the scan config for regionalized behavior and future expansion.'],
                ['userAgentProfile', 'Currently a stored profile label, useful for future browser profile switching.'],
                ['preActionWaitMs', 'Pause after page load before consent detection or scenario action.'],
                ['postActionWaitMs', 'Pause after clicking consent controls so artifacts can settle.'],
                ['allowedSubdomains', 'Extra hostnames treated as first-party during page discovery.'],
                ['includeUrlPatterns', 'Present in the schema, but not yet enforced by the current browser-runner.'],
                ['excludeUrlPatterns', 'Present in the schema, but not yet enforced by the current browser-runner.'],
              ].map(([k, v], i) => (
                <div key={k} style={{ display: 'grid', gridTemplateColumns: '180px 1fr', padding: '12px 16px', borderBottom: i === 8 ? 'none' : `1px solid ${C.hairline}` }}>
                  <span style={{ fontFamily: F.mono, fontSize: 11, color: C.ink, fontWeight: 600 }}>{k}</span>
                  <span style={{ fontSize: 13, color: C.ink70, lineHeight: 1.5 }}>{v}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section id="env" tag="H" title="Environment variables">
            <div style={{ background: C.paper, border: `1px solid ${C.hairline}`, marginBottom: 20 }}>
              {[
                ['DATABASE_URL', 'postgresql://user:pass@host:5432/db', 'PostgreSQL connection string. Test setups may use memory mode in supporting code paths.'],
                ['REDIS_URL', 'redis://localhost:6379', 'Redis connection string for BullMQ and cancellation flags.'],
                ['NODE_ENV', 'development | production | test', 'Runtime environment mode.'],
                ['API_PORT', '3001', 'Port exposed by the backend API server.'],
                ['WORKER_CONCURRENCY', '2', 'Maximum number of scan jobs processed concurrently by the worker.'],
                ['STORAGE_PATH', './data/uploads', 'Directory used for screenshots and other generated scan assets.'],
                ['ALLOW_PRIVATE_TARGETS', 'true', 'Allows localhost and private targets for tests and local fixtures.'],
                ['NEXT_PUBLIC_API_URL', 'http://localhost:3001', 'Frontend API base URL injected at build time.'],
                ['CHROMIUM_PATH', '/usr/bin/chromium', 'Optional browser executable override used by the browser-runner.'],
              ].map(([key, example, desc], i) => (
                <div key={key} style={{ padding: '14px 16px', borderBottom: i === 8 ? 'none' : `1px solid ${C.hairline}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 700, color: C.ink }}>{key}</span>
                    <span style={{ fontFamily: F.mono, fontSize: 10, color: C.slate60, background: C.sandDeep, padding: '2px 6px' }}>{example}</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.slate, lineHeight: 1.5 }}>{desc}</div>
                </div>
              ))}
            </div>
            <Callout title="READ THIS BEFORE TROUBLESHOOTING">
              If scans build successfully but fail at runtime, the first things to verify are database connectivity, Redis connectivity,
              Chromium availability inside the worker container, and whether STORAGE_PATH is writable by the worker process.
            </Callout>
          </Section>

          <footer style={{
            paddingTop: 24, borderTop: `1px solid ${C.hairline}`,
            fontFamily: F.mono, fontSize: 10, color: C.slate60, letterSpacing: 0.5,
          }}>
            PRA DOCUMENTATION · aligned to current implementation
          </footer>
        </main>
      </div>
    </Layout>
  );
}
