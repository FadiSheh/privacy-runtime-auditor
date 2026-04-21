import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

import { Breadcrumb, Layout } from '../../components/layout';
import { StatusBadge } from '../../components/status-badge';
import { C, F, relativeTime, scoreColor } from '../../lib/tokens';
import { fetchProject, fetchProjectScans, startScan } from '../../lib/api';

type ScanSummary = { id: string; status: string; startedAt: string | null; finishedAt: string | null; overallScore: number | null };

export default function ProjectPage() {
  const router = useRouter();
  const projectId = typeof router.query.id === 'string' ? router.query.id : '';
  const [project, setProject] = useState<{ id: string; name: string; rootUrl: string; createdAt: string } | null>(null);
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    void fetchProject(projectId).then((p) => setProject(p as { id: string; name: string; rootUrl: string; createdAt: string }));
    void fetchProjectScans(projectId).then(setScans);
  }, [projectId]);

  async function runScan() {
    if (!projectId) return;
    setLaunching(true);
    try {
      const scan = await startScan(projectId);
      await router.push(`/scans/${scan.id}`);
    } finally {
      setLaunching(false);
    }
  }

  const completedScans = scans.filter((s) => s.status === 'completed' && s.overallScore !== null);
  const last5Scores = completedScans.slice(0, 5).map((s) => s.overallScore!);
  const avgScore = last5Scores.length > 0 ? Math.round(last5Scores.reduce((a, b) => a + b, 0) / last5Scores.length) : null;

  return (
    <Layout>
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 32px 96px', fontFamily: F.body }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: 16 }}>
          <Breadcrumb items={[{ label: 'Projects', href: '/' }, { label: project?.name ?? '…' }]} />
        </div>

        {/* Title row */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 24,
          borderBottom: `1px solid ${C.ink}`,
          paddingBottom: 24,
          marginBottom: 32,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              fontFamily: F.serif,
              fontSize: 44,
              fontWeight: 500,
              margin: 0,
              color: C.ink,
              letterSpacing: -1,
              lineHeight: 1.05,
            }}>
              {project?.name ?? 'Loading…'}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
              {project && (
                <span title={project.rootUrl} style={{ fontFamily: F.mono, fontSize: 13, color: C.slate, borderBottom: `1px dotted ${C.hairlineStrong}` }}>
                  {project.rootUrl}
                </span>
              )}
              <span style={{
                fontFamily: F.mono, fontSize: 10, color: C.slate60,
                background: C.paper, padding: '2px 6px', border: `1px solid ${C.hairline}`, letterSpacing: 0.5,
              }}>
                {projectId.slice(0, 8)}
              </span>
              {project?.createdAt && (
                <span style={{ fontFamily: F.mono, fontSize: 10, color: C.slate60, letterSpacing: 0.5 }}>
                  created {new Date(project.createdAt).toLocaleDateString('en-CA')}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            <button
              onClick={() => void runScan()}
              disabled={launching}
              style={{
                height: 44,
                padding: '0 20px',
                background: launching ? C.ink70 : C.ink,
                color: C.sand,
                border: `1px solid ${C.ink}`,
                fontFamily: F.mono,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                cursor: launching ? 'not-allowed' : 'pointer',
                opacity: launching ? 0.7 : 1,
              }}
            >
              {launching ? 'LAUNCHING…' : '▶ RUN NEW SCAN'}
            </button>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          borderTop: `1px solid ${C.hairline}`,
          borderBottom: `1px solid ${C.hairline}`,
          marginBottom: 40,
        }}>
          {[
            ['Total scans', String(scans.length), 'all time'],
            ['Avg score (last 5)', avgScore !== null ? String(avgScore) : '—', avgScore !== null ? 'moderate' : 'no data'],
            ['Last scan', scans[0]?.startedAt ? new Date(scans[0].startedAt).toLocaleDateString('en-CA') : '—', scans[0]?.startedAt ? relativeTime(scans[0].startedAt) : ''],
            ['Completed scans', String(completedScans.length), `${scans.length - completedScans.length} incomplete`],
          ].map(([k, v, sub], i) => (
            <div key={k} style={{
              padding: '20px 24px',
              borderLeft: i === 0 ? 'none' : `1px solid ${C.hairline}`,
            }}>
              <div style={{ fontFamily: F.mono, fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: C.slate, marginBottom: 6 }}>
                {k}
              </div>
              <div style={{
                fontFamily: i === 3 ? F.mono : F.serif,
                fontSize: 28,
                fontWeight: 500,
                color: C.ink,
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {v}
              </div>
              <div style={{ fontFamily: F.mono, fontSize: 10, color: C.slate60, marginTop: 4 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Scan history */}
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 16,
          borderBottom: `1px solid ${C.ink}`,
          paddingBottom: 12,
          marginBottom: 0,
        }}>
          <h2 style={{ fontFamily: F.serif, fontSize: 26, fontWeight: 500, margin: 0, color: C.ink }}>Scan history</h2>
          <span style={{ fontFamily: F.mono, fontSize: 11, color: C.slate }}>showing {scans.length}</span>
          <div style={{ flex: 1 }} />
        </div>

        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '20px 1fr 200px 120px 90px 80px 90px',
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
          <span>SCAN ID</span>
          <span>STARTED</span>
          <span>STATUS</span>
          <span style={{ textAlign: 'right' }}>SCORE</span>
          <span>DURATION</span>
          <span style={{ textAlign: 'right' }}>ACTION</span>
        </div>

        {scans.length === 0 ? (
          <div style={{ padding: '32px 4px', fontFamily: F.mono, fontSize: 12, color: C.slate60 }}>
            No scans yet for this project.
          </div>
        ) : (
          scans.map((scan, i) => <ScanRow key={scan.id} scan={scan} idx={i} />)
        )}

        <div style={{
          padding: '16px 4px',
          borderTop: `1px dashed ${C.hairlineStrong}`,
          textAlign: 'center',
        }}>
          <span style={{ fontFamily: F.mono, fontSize: 10, color: C.slate60, letterSpacing: 0.5 }}>
            {scans.length} scan{scans.length !== 1 ? 's' : ''} total
          </span>
        </div>
      </main>
    </Layout>
  );
}

function ScanRow({ scan, idx }: { scan: ScanSummary; idx: number }) {
  const [hover, setHover] = useState(false);
  const status = scan.status as 'queued' | 'running' | 'completed' | 'failed';

  const duration = scan.startedAt && scan.finishedAt
    ? (() => {
        const ms = new Date(scan.finishedAt).getTime() - new Date(scan.startedAt).getTime();
        const s = Math.floor(ms / 1000);
        return `${Math.floor(s / 60)}m ${s % 60}s`;
      })()
    : '—';

  return (
    <Link
      href={`/scans/${scan.id}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '20px 1fr 200px 120px 90px 80px 90px',
        alignItems: 'center',
        gap: 20,
        padding: '16px 4px',
        borderBottom: `1px solid ${C.hairline}`,
        background: hover ? C.sandDeep + '55' : 'transparent',
        transition: 'background .12s',
        cursor: 'pointer',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <span style={{ fontFamily: F.mono, fontSize: 10, color: C.slate30 }}>
        {String(idx + 1).padStart(2, '0')}
      </span>
      <span style={{ fontFamily: F.mono, fontSize: 12, color: C.ink, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {scan.id}
      </span>
      <div style={{ fontFamily: F.mono, fontSize: 12, color: C.ink70 }}>
        {scan.startedAt ? new Date(scan.startedAt).toLocaleString('en-CA', { hour12: false }) : '—'}
        {scan.startedAt && (
          <div style={{ fontSize: 10, color: C.slate60, marginTop: 2 }}>{relativeTime(scan.startedAt)}</div>
        )}
      </div>
      <div><StatusBadge status={status} /></div>
      <div style={{ textAlign: 'right' }}>
        {scan.overallScore !== null ? (
          <span style={{
            fontFamily: F.mono,
            fontSize: 18,
            fontWeight: 500,
            color: scoreColor(scan.overallScore),
            fontVariantNumeric: 'tabular-nums',
          }}>
            {scan.overallScore}
          </span>
        ) : <span style={{ color: C.slate30, fontFamily: F.mono }}>—</span>}
      </div>
      <div style={{ fontFamily: F.mono, fontSize: 12, color: C.slate }}>{duration}</div>
      <div style={{ textAlign: 'right' }}>
        {scan.status === 'completed' ? (
          <span style={{ fontFamily: F.mono, fontSize: 11, color: C.ink, letterSpacing: 0.5, borderBottom: `1px solid ${C.ink}`, paddingBottom: 1 }}>
            REPORT →
          </span>
        ) : scan.status === 'failed' ? (
          <span style={{ fontFamily: F.mono, fontSize: 11, color: C.rust, letterSpacing: 0.5 }}>
            VIEW →
          </span>
        ) : (
          <span style={{ fontFamily: F.mono, fontSize: 11, color: C.slate30 }}>—</span>
        )}
      </div>
    </Link>
  );
}
