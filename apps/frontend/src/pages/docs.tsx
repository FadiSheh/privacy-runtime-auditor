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


export default function DocsPage() {
  return (
    <Layout activeNav="docs">
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '200px 1fr', gap: 0 }}>
        {/* Sidebar */}
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
              ['overview',  'Overview',       'A'],
              ['pipeline',  'Scan pipeline',  'B'],
              ['evidence',  'Evidence types', 'C'],
              ['scoring',   'Scoring',        'D'],
              ['config',    'Configuration',  'E'],
              ['env',       'Environment',    'F'],
            ].map(([id, label, tag]) => (
              <a key={id} href={`#${id}`} style={{
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

        {/* Content */}
        <main style={{ padding: '48px 40px 96px', minWidth: 0, fontFamily: F.body }}>
          <div style={{ borderBottom: `1px solid ${C.hairline}`, paddingBottom: 24, marginBottom: 48 }}>
            <h1 style={{ fontFamily: F.serif, fontSize: 44, fontWeight: 500, margin: 0, color: C.ink, letterSpacing: -1, lineHeight: 1 }}>
              Documentation
            </h1>
            <p style={{ fontFamily: F.mono, fontSize: 11, color: C.slate, marginTop: 10, letterSpacing: 0.5 }}>
              Privacy Runtime Auditor · technical reference
            </p>
          </div>

          {/* A · OVERVIEW */}
          <Section id="overview" tag="A" title="Overview">
            <p style={{ fontSize: 15, color: C.ink70, lineHeight: 1.7, maxWidth: 700, marginBottom: 20 }}>
              PRA is a production-oriented runtime privacy compliance auditing platform. It detects cookies, storage entries, scripts, network requests, pixels, and third-party vendors by crawling websites dynamically and testing behavior across multiple consent scenarios.
            </p>
            <div style={{ background: C.paper, border: `1px solid ${C.hairline}`, padding: '16px 20px' }}>
              <div style={{ fontFamily: F.mono, fontSize: 10, color: C.slate, letterSpacing: 1, marginBottom: 12, fontWeight: 600 }}>
                KEY CAPABILITIES
              </div>
              {[
                ['Dynamic crawling',        'Discovers up to 15 relevant pages per target domain'],
                ['4 consent scenarios',     'Pre-consent, accept-all, reject-all, granular (functional only)'],
                ['Runtime evidence',        'Cookies, localStorage, sessionStorage, IndexedDB, scripts, requests'],
                ['12 deterministic rules',  'R001–R012 evaluated against each page × scenario combination'],
                ['5-dimension scoring',     'Pre-consent, Consent UX, Blocking, Policy alignment, Overall'],
                ['PDF + JSON reports',      'Legal-grade output with replay traces and DOM snapshots'],
                ['Baseline regression',     'Diff against a prior scan to detect new trackers and regressions'],
              ].map(([k, v]) => <KV key={k} k={k!} v={v!} />)}
            </div>
          </Section>

          {/* B · SCAN PIPELINE */}
          <Section id="pipeline" tag="B" title="Scan pipeline">
            <p style={{ fontSize: 14, color: C.slate, lineHeight: 1.65, marginBottom: 20, maxWidth: 680 }}>
              Each scan runs a deterministic 8-phase pipeline. Phases are sequential — a phase failure terminates the pipeline and records a failed scan.
            </p>
            <div style={{ borderTop: `1px solid ${C.hairline}` }}>
              {[
                ['01', 'CRAWL',   'A headless Chromium browser visits the target domain and discovers up to 15 pages by following internal links from the root URL, respecting robots.txt and configurable depth limits.'],
                ['02', 'REPLAY',  'Each discovered page is loaded in 4 distinct browser contexts — pre-consent, accept-all, reject-all, and granular (functional only). The CMP is interacted with programmatically via DOM selectors and heuristics.'],
                ['03', 'EVIDENCE','For each page × scenario combination, the runner captures cookies, localStorage, sessionStorage, IndexedDB, network requests (HAR), loaded scripts, and DOM snapshots.'],
                ['04', 'VENDOR',  'Every cookie domain, request host, and script source is matched against the built-in vendor registry (Google Analytics, Meta Pixel, HotJar, etc.) and classified by declared purpose.'],
                ['05', 'RULES',   'The rules engine runs 12 deterministic rules across the collected evidence, producing findings with severity levels and scenario references.'],
                ['06', 'POLICY',  'The site\'s privacy policy URL (if resolvable) is fetched and parsed to cross-reference declared vendors versus runtime observations.'],
                ['07', 'SCORE',   'Four compliance dimension scores (0–100) and a weighted overall score are computed from the rule findings.'],
                ['08', 'REPORT',  'A structured JSON report and a human-readable PDF are produced, stored, and made available via the report API endpoints.'],
              ].map(([n, phase, body]) => (
                <div key={n} style={{ display: 'grid', gridTemplateColumns: '32px 100px 1fr', gap: 20, padding: '16px 0', borderBottom: `1px solid ${C.hairline}`, alignItems: 'flex-start' }}>
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
          </Section>

          {/* C · EVIDENCE TYPES */}
          <Section id="evidence" tag="C" title="Evidence types">
            <div style={{ background: C.paper, border: `1px solid ${C.hairline}` }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '180px 1fr',
                padding: '8px 16px', background: C.sandDeep,
                fontFamily: F.mono, fontSize: 9, letterSpacing: 1, color: C.slate, fontWeight: 600,
                borderBottom: `1px solid ${C.hairline}`,
              }}>
                <span>TYPE</span>
                <span>WHAT PRA LOOKS FOR</span>
              </div>
              {[
                ['Cookies (pre-consent)',     'Tracking identifiers fired before the user consents — a GDPR/ePrivacy violation'],
                ['Cookies (after reject)',    'Cookies that persist after "Reject all" — proof of ineffective opt-out'],
                ['localStorage',             'Non-functional data stored without consent'],
                ['sessionStorage',           'Session identifiers written before consent decision'],
                ['IndexedDB',                'Structured data stores written before consent decision'],
                ['Network requests',         'Third-party beacons and pixels sent before or despite rejection'],
                ['Loaded scripts',           'Third-party SDKs executing before consent'],
                ['Vendor classification',    'Whether observed vendors are disclosed in the privacy policy'],
                ['Consent banner behavior',  'Banner presence, reject-all accessibility, dark patterns (R004)'],
                ['Granular controls',        'Whether functional-only consent actually limits data collection'],
              ].map(([type, desc], i) => (
                <div key={type} style={{
                  display: 'grid', gridTemplateColumns: '180px 1fr',
                  padding: '12px 16px', alignItems: 'flex-start',
                  borderBottom: i === 9 ? 'none' : `1px solid ${C.hairline}`,
                }}>
                  <span style={{ fontFamily: F.mono, fontSize: 11, color: C.ink, fontWeight: 500 }}>{type}</span>
                  <span style={{ fontSize: 13, color: C.ink70, lineHeight: 1.5 }}>{desc}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* D · SCORING */}
          <Section id="scoring" tag="D" title="Scoring">
            <p style={{ fontSize: 14, color: C.slate, lineHeight: 1.65, marginBottom: 20, maxWidth: 680 }}>
              Scores range from <strong>0</strong> (non-compliant) to <strong>100</strong> (fully compliant). A score of 0 does not mean the site is broken — it means the dimension has critical unresolved findings.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: C.hairline, border: `1px solid ${C.hairline}`, marginBottom: 24 }}>
              {[
                ['≥ 75',  '#2E7D32', '#D6E7D3', 'LOW RISK',   'Compliant. Reject-all is honored and policy aligns with runtime.'],
                ['50–74', '#C4601F', '#F4E1CF', 'MODERATE',   'Partial compliance. Some findings require remediation.'],
                ['< 50',  '#B73A2B', '#F4DAD4', 'ELEVATED',   'Critical findings present. Likely GDPR/ePrivacy violations.'],
              ].map(([range, col, bg, label, desc]) => (
                <div key={range} style={{ background: C.paper, padding: 20 }}>
                  <div style={{ fontFamily: F.mono, fontSize: 32, fontWeight: 500, color: col, lineHeight: 1, marginBottom: 8 }}>{range}</div>
                  <div style={{ fontFamily: F.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1, padding: '3px 8px', background: bg, color: col, display: 'inline-block', marginBottom: 10 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 12, color: C.ink70, lineHeight: 1.5 }}>{desc}</div>
                </div>
              ))}
            </div>
            <div style={{ background: C.paper, border: `1px solid ${C.hairline}` }}>
              {[
                ['Pre-consent',   'How clean the page is before any user interaction'],
                ['Consent UX',    'Quality of the consent mechanism — banner presence, reject-all accessibility'],
                ['Blocking',      'How effectively vendors are blocked after rejection'],
                ['Policy',        'Alignment between runtime behaviour and the privacy policy'],
                ['Overall',       'Weighted aggregate of the four dimensions above'],
              ].map(([dim, desc], i) => (
                <div key={dim} style={{
                  display: 'grid', gridTemplateColumns: '180px 1fr',
                  padding: '12px 16px', alignItems: 'flex-start',
                  borderBottom: i === 4 ? 'none' : `1px solid ${C.hairline}`,
                }}>
                  <span style={{ fontFamily: F.mono, fontSize: 11, color: C.ink, fontWeight: 600 }}>{dim}</span>
                  <span style={{ fontSize: 13, color: C.ink70, lineHeight: 1.5 }}>{desc}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* E · CONFIGURATION */}
          <Section id="config" tag="E" title="Configuration">
            <p style={{ fontSize: 14, color: C.slate, lineHeight: 1.65, marginBottom: 20 }}>
              Scan configuration is passed as a JSON body to <code style={{ fontFamily: F.mono, fontSize: 12, background: C.sandDeep, padding: '2px 6px' }}>POST /projects/:id/scans</code>.
            </p>
            <pre style={{ background: C.ink, color: C.sandDeeper, padding: 20, fontFamily: F.mono, fontSize: 12, lineHeight: 1.8, margin: 0, overflowX: 'auto' }}>{`{
  "maxPages": 15,          // max pages to crawl from root URL
  "preActionWaitMs": 2000, // wait after page load before consent interaction
  "postActionWaitMs": 1000,// wait after consent interaction before evidence capture
  "scanTimeoutMs": 30000   // per-page timeout in milliseconds
}`}</pre>
          </Section>

          {/* F · ENVIRONMENT */}
          <Section id="env" tag="F" title="Environment variables">
            <div style={{ background: C.paper, border: `1px solid ${C.hairline}` }}>
              {[
                ['DATABASE_URL',            'postgresql://user:pass@host:5432/db', 'PostgreSQL connection string. Use \u201cmemory\u201d for in-memory PGlite (tests).'],
                ['REDIS_URL',               'redis://localhost:6379',              'Redis connection string. Use \u201cmemory\u201d for no-op queue (tests).'],
                ['NODE_ENV',                'development | production | test',      'Runtime environment.'],
                ['API_PORT',                '3001',                                 'Port for the backend API server.'],
                ['WORKER_CONCURRENCY',      '2',                                    'Number of concurrent scan jobs processed by the worker.'],
                ['STORAGE_PATH',            './data/uploads',                       'Path for storing screenshots and HAR files.'],
                ['ALLOW_PRIVATE_TARGETS',   'true',                                 'Allow scanning localhost/127.0.0.1 (integration tests only).'],
                ['NEXT_PUBLIC_API_URL',      'http://localhost:3001',               'API base URL injected into the frontend at build time.'],
              ].map(([key, example, desc], i) => (
                <div key={key} style={{
                  padding: '14px 16px',
                  borderBottom: i === 7 ? 'none' : `1px solid ${C.hairline}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                    <span style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 700, color: C.ink }}>{key}</span>
                    <span style={{ fontFamily: F.mono, fontSize: 10, color: C.slate60, background: C.sandDeep, padding: '2px 6px' }}>{example}</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.slate, lineHeight: 1.5 }}>{desc}</div>
                </div>
              ))}
            </div>
          </Section>

          <footer style={{
            paddingTop: 24, borderTop: `1px solid ${C.hairline}`,
            fontFamily: F.mono, fontSize: 10, color: C.slate60, letterSpacing: 0.5,
          }}>
            PRA DOCUMENTATION · privacy-runtime-auditor-spec-v2
          </footer>
        </main>
      </div>
    </Layout>
  );
}
