import Link from 'next/link';
import { useRouter } from 'next/router';
import { FormEvent, useEffect, useRef, useState } from 'react';

import { Layout } from '../components/layout';
import { StatusBadge } from '../components/status-badge';
import { C, F, relativeTime, scoreColor } from '../lib/tokens';
import { createProject, fetchProjectScans, fetchProjects, startScan, type ProjectSummary } from '../lib/api';

type ProjectWithScan = ProjectSummary & {
  latestScan?: { id: string; status: string; overallScore: number | null; startedAt: string | null };
};

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [rootUrl, setRootUrl] = useState('');
  const [projects, setProjects] = useState<ProjectWithScan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    void fetchProjects()
      .then(async (list) => {
        const withScans = await Promise.all(
          list.map(async (p) => {
            const scans = await fetchProjectScans(p.id).catch(() => []);
            return { ...p, latestScan: scans[0] };
          }),
        );
        setProjects(withScans);
      })
      .catch((requestError: Error) => setError(requestError.message));
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return setError('Project name is required.');
    setLoading(true);
    setError(null);
    try {
      const project = await createProject({ name, rootUrl: rootUrl.trim() });
      const scan = await startScan(project.id);
      await router.push(`/scans/${scan.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create project and start scan.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 32px 96px', fontFamily: F.body }}>
        {/* Hero */}
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 16,
          marginBottom: 32,
          borderBottom: `1px solid ${C.hairline}`,
          paddingBottom: 24,
        }}>
          <h1 style={{ fontFamily: F.serif, fontSize: 44, fontWeight: 500, margin: 0, color: C.ink, letterSpacing: -1, lineHeight: 1 }}>
            New audit
          </h1>
          <span style={{ fontFamily: F.mono, fontSize: 11, color: C.slate, letterSpacing: 0.5 }}>
            / Start a runtime compliance investigation against a target domain.
          </span>
        </div>

        {/* Two-column: form + callouts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 64 }}>
          {/* Left: form */}
          <section>
            <form ref={formRef} onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="pname" style={{ fontFamily: F.mono, fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: C.slate }}>
                  Project name
                </label>
                <input
                  id="pname"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Retailer Corp — EU storefront"
                  style={{
                    height: 48,
                    padding: '0 14px',
                    background: C.paper,
                    border: `1px solid ${C.hairlineStrong}`,
                    color: C.ink,
                    fontSize: 15,
                    outline: 'none',
                    fontFamily: F.body,
                    width: '100%',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = C.ink; e.target.style.boxShadow = `0 0 0 2px ${C.sandDeeper}`; }}
                  onBlur={(e) => { e.target.style.borderColor = C.hairlineStrong; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="purl" style={{ fontFamily: F.mono, fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: C.slate }}>
                  Root URL
                </label>
                <input
                  id="purl"
                  value={rootUrl}
                  onChange={(e) => setRootUrl(e.target.value)}
                  placeholder="https://example.com"
                  style={{
                    height: 48,
                    padding: '0 14px',
                    background: C.paper,
                    border: `1px solid ${C.hairlineStrong}`,
                    color: C.ink,
                    fontSize: 13,
                    outline: 'none',
                    fontFamily: F.mono,
                    width: '100%',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = C.ink; e.target.style.boxShadow = `0 0 0 2px ${C.sandDeeper}`; }}
                  onBlur={(e) => { e.target.style.borderColor = C.hairlineStrong; e.target.style.boxShadow = 'none'; }}
                />
                <span style={{ fontFamily: F.mono, fontSize: 10, color: C.slate60 }}>
                  Crawler honors robots.txt · max depth 3 · timeout 90s per page
                </span>
              </div>

              {error && (
                <div style={{
                  background: C.rustBg,
                  border: `1px solid ${C.rust}`,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                }}>
                  <span style={{ fontFamily: F.mono, fontSize: 10, fontWeight: 700, color: C.rust, letterSpacing: 1, marginTop: 2 }}>ERR</span>
                  <div style={{ flex: 1, fontSize: 13, color: '#6B1A10' }}>{error}</div>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B1A10', fontSize: 16, lineHeight: 1, padding: 0 }}
                  >
                    ×
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    height: 44,
                    padding: '0 20px',
                    background: loading ? C.ink70 : C.ink,
                    color: C.sand,
                    border: `1px solid ${C.ink}`,
                    fontFamily: F.mono,
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'STARTING SCAN…' : 'START AUDIT ↵'}
                </button>
              </div>
            </form>

            {/* Scan defaults */}
            <div style={{ marginTop: 40, paddingTop: 24, borderTop: `1px dashed ${C.hairlineStrong}` }}>
              <div style={{ fontFamily: F.mono, fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: C.slate, marginBottom: 12 }}>
                Scan defaults
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontFamily: F.mono, fontSize: 12, color: C.ink70 }}>
                {[
                  ['USER_AGENT',   'PRA/2.6 (+audit-bot)'],
                  ['VIEWPORT',     '1366×768, 390×844'],
                  ['CRAWL_DEPTH',  '3'],
                  ['REPLAY_TRIES', '2'],
                  ['REGION',       'eu-west-3'],
                  ['TIMEOUT_MS',   '90000'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: 12, padding: '4px 0' }}>
                    <span style={{ color: C.slate60, minWidth: 110 }}>{k}</span>
                    <span style={{ color: C.ink }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Right: callouts */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ fontFamily: F.mono, fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: C.slate, marginBottom: 16 }}>
              What the scanner will do
            </div>
            {[
              {
                code: '01',
                title: '4 consent scenarios, per page',
                body: 'Replays no-consent, accept-all, reject-all, and granular — cookies, scripts, network, localStorage captured per scenario.',
                tag: 'REPLAY',
              },
              {
                code: '02',
                title: '12 deterministic rules, R001 – R012',
                body: 'Pre-consent leak, reject-all bypass, runtime blocking delta, policy-runtime alignment, …',
                tag: 'RULES',
              },
              {
                code: '03',
                title: 'PDF + JSON evidence reports',
                body: 'Severity-weighted findings, 5-dimension score, historical regression delta versus your baseline.',
                tag: 'OUTPUT',
              },
            ].map((it, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '56px 1fr auto',
                alignItems: 'flex-start',
                gap: 16,
                padding: '20px 0',
                borderTop: i === 0 ? `1px solid ${C.ink}` : `1px solid ${C.hairline}`,
                borderBottom: i === 2 ? `1px solid ${C.ink}` : 'none',
              }}>
                <span style={{ fontFamily: F.mono, fontSize: 28, fontWeight: 400, color: C.slate30, lineHeight: 1, letterSpacing: -1 }}>
                  {it.code}
                </span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 4 }}>{it.title}</div>
                  <div style={{ fontSize: 13, color: C.slate, lineHeight: 1.5 }}>{it.body}</div>
                </div>
                <span style={{
                  fontFamily: F.mono, fontSize: 9, fontWeight: 700, letterSpacing: 1,
                  color: C.slate60, padding: '2px 6px', border: `1px solid ${C.hairline}`,
                  marginTop: 6,
                }}>
                  {it.tag}
                </span>
              </div>
            ))}

            <div style={{ marginTop: 20, fontFamily: F.mono, fontSize: 11, color: C.slate, lineHeight: 1.6 }}>
              <span style={{ color: C.rust, fontWeight: 700 }}>✶</span> Output is legal-grade.
              Every finding carries a replay trace, HAR sample and DOM snapshot — sufficient for inclusion in a DPA filing.
            </div>
          </aside>
        </div>

        {/* Recent projects */}
        <section style={{ marginTop: 72 }}>
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 16,
            borderBottom: `1px solid ${C.ink}`,
            paddingBottom: 12,
            marginBottom: 0,
          }}>
            <h2 style={{ fontFamily: F.serif, fontSize: 28, fontWeight: 500, margin: 0, color: C.ink, letterSpacing: -0.5 }}>
              Recent projects
            </h2>
            <span style={{ fontFamily: F.mono, fontSize: 11, color: C.slate }}>
              n={projects.length}
            </span>
            <div style={{ flex: 1 }} />
          </div>

          {projects.length === 0 ? (
            <div style={{ border: `1px dashed ${C.hairlineStrong}`, padding: 32, background: C.paper, marginTop: 0 }}>
              <div style={{ fontFamily: F.mono, fontSize: 10, color: C.slate, letterSpacing: 1, marginBottom: 8 }}>
                NO PROJECTS · EMPTY STATE
              </div>
              <div style={{ fontFamily: F.serif, fontSize: 18, color: C.ink, marginBottom: 6, letterSpacing: -0.4 }}>
                You have not yet run an audit.
              </div>
              <div style={{ fontSize: 13, color: C.slate, marginBottom: 16, lineHeight: 1.5 }}>
                Start with a single root URL — PRA will crawl up to 15 pages, replay 4 consent
                scenarios on each, and evaluate all 12 rules.
              </div>
              <button
                type="button"
                onClick={() => formRef.current?.querySelector('input')?.focus()}
                style={{ fontFamily: F.mono, fontSize: 11, color: C.ink, borderBottom: `1px solid ${C.ink}`, background: 'none', border: 'none', cursor: 'pointer', padding: 0, letterSpacing: 0.5, textDecoration: 'underline' }}
              >
                ↑ JUMP TO FORM
              </button>
            </div>
          ) : (
            <div>
              {/* Table header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '24px 1.4fr 1.6fr 160px 110px 72px',
                gap: 20,
                padding: '10px 4px',
                fontFamily: F.mono,
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: 1,
                color: C.slate,
                textTransform: 'uppercase',
                borderBottom: `1px solid ${C.hairline}`,
              }}>
                <span>#</span>
                <span>PROJECT</span>
                <span>ROOT URL</span>
                <span>CREATED</span>
                <span>STATUS</span>
                <span style={{ textAlign: 'right' }}>SCORE</span>
              </div>
              {projects.map((p, i) => (
                <ProjectRow key={p.id} project={p} index={i} last={i === projects.length - 1} />
              ))}
            </div>
          )}
        </section>

        <footer style={{
          marginTop: 64,
          paddingTop: 24,
          borderTop: `1px solid ${C.hairline}`,
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: F.mono,
          fontSize: 10,
          color: C.slate60,
          letterSpacing: 0.5,
        }}>
          <span>PRA · BUILD 2026.04</span>
          <span>KEYBOARD: ⌘N NEW · ⌘K SEARCH · ? HELP</span>
        </footer>
      </main>
    </Layout>
  );
}

function ProjectRow({ project, index, last }: { project: ProjectWithScan; index: number; last: boolean }) {
  const [hover, setHover] = useState(false);
  const urlTrunc = project.rootUrl.length > 60 ? project.rootUrl.slice(0, 57) + '…' : project.rootUrl;
  const shortId = project.id.slice(0, 8);
  const status = (project.latestScan?.status ?? 'queued') as 'queued' | 'running' | 'completed' | 'failed';
  const score = project.latestScan?.overallScore ?? null;
  const createdAt = new Date(project.createdAt);

  return (
    <Link
      href={`/projects/${project.id}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '24px 1.4fr 1.6fr 160px 110px 72px',
        alignItems: 'center',
        gap: 20,
        padding: '18px 4px',
        borderBottom: last ? 'none' : `1px solid ${C.hairline}`,
        background: hover ? C.sandDeep + '55' : 'transparent',
        cursor: 'pointer',
        transition: 'background .12s',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <span style={{ fontFamily: F.mono, fontSize: 10, color: C.slate30, letterSpacing: 0.5 }}>
        {String(index + 1).padStart(2, '0')}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {project.name}
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 10, color: C.slate60, letterSpacing: 0.3 }}>
          {shortId}
        </div>
      </div>
      <div title={project.rootUrl} style={{ fontFamily: F.mono, fontSize: 12, color: C.slate, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {urlTrunc}
      </div>
      <div style={{ fontFamily: F.mono, fontSize: 11, color: C.ink70 }}>
        {createdAt.toLocaleDateString('en-CA')}
        <div style={{ fontSize: 10, color: C.slate60, marginTop: 2 }}>
          {relativeTime(project.createdAt)}
        </div>
      </div>
      <div>
        {project.latestScan ? <StatusBadge status={status} /> : (
          <span style={{ fontFamily: F.mono, fontSize: 10, color: C.slate30 }}>—</span>
        )}
      </div>
      <div style={{ textAlign: 'right' }}>
        {score !== null ? (
          <span style={{
            fontFamily: F.mono, fontSize: 22, fontWeight: 500,
            color: scoreColor(score), letterSpacing: -0.5, fontVariantNumeric: 'tabular-nums',
          }}>
            {score}
            <span style={{ fontSize: 11, color: C.slate60, marginLeft: 2 }}>/100</span>
          </span>
        ) : (
          <span style={{ fontFamily: F.mono, fontSize: 11, color: C.slate30 }}>—</span>
        )}
      </div>
    </Link>
  );
}
