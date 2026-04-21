import Link from 'next/link';
import { useRouter } from 'next/router';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { Breadcrumb, Layout } from '../../components/layout';
import { ScoreCard } from '../../components/score-card';
import { SeverityBadge } from '../../components/severity-badge';
import { StatusBadge } from '../../components/status-badge';
import { C, F } from '../../lib/tokens';
import { fetchScanReport, fetchScanStatus, cancelScan, type ScanReport, type ScanStatus } from '../../lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// ── Polling hook ────────────────────────────────────────────────────────────
function usePollingScan(scanId: string) {
  const [status, setStatus] = useState<ScanStatus | null>(null);
  const [report, setReport] = useState<ScanReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scanId) return;
    let active = true;
    let timer: NodeJS.Timeout | undefined;

    const tick = async () => {
      try {
        const next = await fetchScanStatus(scanId);
        if (!active) return;
        setStatus(next);
        setError(null);
        if (next.status === 'completed') {
          const r = await fetchScanReport(scanId);
          if (active) setReport(r);
          return;
        }
        if (next.status !== 'failed' && next.status !== 'cancelled') {
          timer = setTimeout(() => { void tick(); }, 2500);
        }
      } catch (requestError) {
        if (!active) return;
        setError(requestError instanceof Error ? requestError.message : 'Unable to refresh scan status.');
        timer = setTimeout(() => { void tick(); }, 5000);
      }
    };

    void tick();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [scanId]);

  return { status, report, error };
}

// ── Phase helper ─────────────────────────────────────────────────────────────
function getPhase(progress: number): number {
  if (progress < 15) return 0;
  if (progress < 50) return 1;
  if (progress < 70) return 2;
  if (progress < 80) return 3;
  if (progress < 90) return 4;
  return 5;
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function ScanPage() {
  const router = useRouter();
  const scanId = typeof router.query.id === 'string' ? router.query.id : '';
  const { status, report, error } = usePollingScan(scanId);

  const vendors = useMemo(() => {
    if (!report) return [] as string[];
    return Array.from(new Set(
      report.pages.flatMap((p) =>
        p.scenarioResults.flatMap((s) =>
          s.artifacts.map((a) => a.vendorName).filter((v): v is string => Boolean(v)),
        ),
      ),
    ));
  }, [report]);

  const declaredVendors = useMemo(() => {
    if (!report) return new Set<string>();
    return new Set(report.policies.flatMap((p) => p.extracted.vendors));
  }, [report]);

  const projectId = report?.projectId ?? status?.scanId?.split('_')[0] ?? '';

  // ── Live scan view ─────────────────────────────────────────────────────────
  if (!report) {
    return (
      <Layout>
        <LiveScanView scanId={scanId} status={status} projectId={projectId} error={error} />
      </Layout>
    );
  }

  // ── Completed report view ─────────────────────────────────────────────────
  return (
    <Layout>
      <ReportView scanId={scanId} report={report} vendors={vendors} declaredVendors={declaredVendors} />
    </Layout>
  );
}

// ── Live scan view ────────────────────────────────────────────────────────────
function LiveScanView({ scanId, status, projectId, error }: { scanId: string; status: ScanStatus | null; projectId: string; error: string | null }) {
  const [elapsed, setElapsed] = useState(0);
  const [cancelling, setCancelling] = useState(false);
  const startRef = useRef<number | null>(null);

  async function handleCancel() {
    setCancelling(true);
    try {
      await cancelScan(scanId);
    } catch {
      setCancelling(false);
    }
  }

  useEffect(() => {
    if (status?.startedAt && !startRef.current) {
      startRef.current = new Date(status.startedAt).getTime();
    }
  }, [status?.startedAt]);

  useEffect(() => {
    const t = setInterval(() => {
      if (startRef.current) {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  const progress = status?.progress ?? 0;
  const currentPhaseLabel = status?.currentActivity?.phase || 'WAITING';
  const activePhase = getPhase(progress);

  const phases = ['CRAWL', 'REPLAY', 'EVIDENCE', 'RULES', 'SCORE', 'REPORT'] as const;

  return (
    <div>
      {/* Dark status header */}
      <section style={{ background: C.ink, color: C.sand, padding: '28px 32px 32px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ marginBottom: 20, opacity: 0.8 }}>
            <Breadcrumb items={[
              { label: 'Projects', href: '/' },
              { label: 'Scan', href: projectId ? `/projects/${projectId}` : '/' },
              { label: scanId.slice(0, 12) },
            ]} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
            <div style={{ position: 'relative', width: 12, height: 12, background: C.amber }}>
              <div style={{ position: 'absolute', inset: -4, border: `1px solid ${C.amber}`, animation: 'pra-pulse 1.4s ease-in-out infinite' }} />
            </div>
            <span style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 700, letterSpacing: 2, color: C.amber }}>
              SCAN · {(status?.status ?? 'QUEUED').toUpperCase()}
            </span>
            <span style={{ flex: 1 }} />
            <span style={{ fontFamily: F.mono, fontSize: 10, color: C.sandDeeper, letterSpacing: 0.5 }}>
              auto-refresh · 2.5s
            </span>
          </div>

          <h1 style={{
            fontFamily: F.serif,
            fontSize: 40,
            fontWeight: 500,
            margin: '0 0 20px',
            color: C.sand,
            letterSpacing: -0.8,
            lineHeight: 1.1,
          }}>
            Scan {scanId.slice(0, 12)} — {status ? `${progress.toFixed(1)}% complete` : 'waiting for worker'}
          </h1>

          {/* Stats grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            borderTop: `1px solid ${C.ink70}`,
            borderBottom: `1px solid ${C.ink70}`,
            marginBottom: 24,
          }}>
            {[
              ['STARTED',   status?.startedAt ? new Date(status.startedAt).toLocaleTimeString('en-CA', { hour12: false }) : '—', 'UTC'],
              ['ELAPSED',   `${mm}:${ss}`, 'running'],
              ['SCENARIOS', `${status?.completedScenarios ?? 0} / ${status?.totalScenarios ?? 0}`, `${progress.toFixed(1)}%`],
              ['PAGES',     String(status?.pageCount ?? 0), 'discovered'],
            ].map(([k, v, sub], i) => (
              <div key={k} style={{ padding: '14px 20px', borderLeft: i === 0 ? 'none' : `1px solid ${C.ink70}` }}>
                <div style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 600, letterSpacing: 1.5, color: C.sandDeeper, marginBottom: 4 }}>{k}</div>
                <div style={{ fontFamily: F.mono, fontSize: 22, fontWeight: 500, color: C.sand, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
                <div style={{ fontFamily: F.mono, fontSize: 10, color: C.slate30, marginTop: 3 }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontFamily: F.mono, fontSize: 10, color: C.sandDeeper, letterSpacing: 0.5 }}>
              <span>OVERALL PROGRESS</span>
              <span>{progress.toFixed(1)}%</span>
            </div>
            <div style={{ height: 10, background: C.ink90, border: `1px solid ${C.ink70}`, position: 'relative', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `max(8px, ${progress}%)`, background: C.moss, transition: 'width .3s' }} />
            </div>
          </div>

          {/* Phase pipeline */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 2, marginTop: 16 }}>
            {phases.map((phase, i) => {
              const isDone = i < activePhase;
              const isActive = i === activePhase && (status?.status === 'running' || status?.status === 'queued');
              const isPending = !isDone && !isActive;
              return (
                <div key={phase} style={{
                  padding: '8px 10px',
                  background: isDone ? C.moss : isActive ? C.ink90 : 'transparent',
                  border: `1px solid ${isPending ? C.ink70 : isDone ? C.moss : C.amber}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <span style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: 1, color: isPending ? C.slate30 : C.sand, fontWeight: 600 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{
                    fontFamily: F.mono, fontSize: 10, letterSpacing: 1, fontWeight: 600,
                    color: isPending ? C.slate30 : isDone ? '#fff' : C.amber,
                  }}>
                    {phase}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <Link href="/" style={{
              background: 'transparent', color: C.sandDeeper,
              border: `1px solid ${C.ink70}`, padding: '0 16px', height: 36,
              fontFamily: F.mono, fontSize: 11, fontWeight: 600, letterSpacing: 1,
              display: 'inline-flex', alignItems: 'center', textDecoration: 'none',
            }}>
              ← BACK TO PROJECTS
            </Link>
            {(status?.status === 'queued' || status?.status === 'running') && (
              <button
                onClick={() => { void handleCancel(); }}
                disabled={cancelling}
                style={{
                  background: 'transparent',
                  color: cancelling ? C.slate30 : C.rust,
                  border: `1px solid ${cancelling ? C.ink70 : C.rust}`,
                  padding: '0 16px', height: 36,
                  fontFamily: F.mono, fontSize: 11, fontWeight: 600, letterSpacing: 1,
                  cursor: cancelling ? 'not-allowed' : 'pointer',
                  opacity: cancelling ? 0.6 : 1,
                }}
              >
                {cancelling ? 'CANCELLING…' : '✕ CANCEL SCAN'}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Status message */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '32px' }}>
        <div style={{
          border: `1px solid ${C.hairline}`,
          background: C.paper,
          padding: 24,
          fontFamily: F.mono,
          fontSize: 12,
          color: C.ink70,
          lineHeight: 1.8,
        }}>
          <div style={{ color: C.slate, letterSpacing: 1, fontSize: 10, marginBottom: 8 }}>CURRENT ACTIVITY</div>
          {error && (
            <div style={{ color: C.rust, marginBottom: 12 }}>
              API refresh failed: {error}. Retrying automatically.
            </div>
          )}
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontWeight: 600, color: C.amber }}>Phase:</span> {currentPhaseLabel}
          </div>
          {status?.currentActivity?.message && (
            <div style={{ color: C.sand }}>
              {status.currentActivity.message}
            </div>
          )}
          {!status?.currentActivity?.message && status?.status === 'queued' && 'Waiting for worker to pick up the job…'}
          {!status?.currentActivity?.message && status?.status === 'running' && `Worker is active — ${status.completedScenarios} of ${status.totalScenarios} scenarios completed across ${status.pageCount} pages.`}
          {status?.status === 'failed' && <span style={{ color: C.rust }}>Scan failed. Check worker logs for details.</span>}
          {status?.status === 'cancelled' && <span style={{ color: C.slate }}>Scan was cancelled.</span>}
          {!status && 'Connecting to API…'}
        </div>
        <div style={{
          marginTop: 12,
          fontFamily: F.mono,
          fontSize: 10,
          color: C.slate60,
          letterSpacing: 0.5,
        }}>
          Keep this tab open — the view will automatically switch to the full report when the scan completes.
        </div>
      </section>
    </div>
  );
}

// ── Report view ───────────────────────────────────────────────────────────────
type ReportViewProps = {
  scanId: string;
  report: ScanReport;
  vendors: string[];
  declaredVendors: Set<string>;
};

function ReportView({ scanId, report, vendors, declaredVendors }: ReportViewProps) {
  const [openFindings, setOpenFindings] = useState<Set<string>>(new Set());
  const [sevFilter, setSevFilter] = useState<Set<string>>(new Set(['critical', 'high', 'medium', 'low', 'info']));
  const [expandedPage, setExpandedPage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('scores');

  const shownFindings = report.findings.filter((f) => sevFilter.has(f.severity));

  const sections = [
    ['scores', 'Scores', 'A'],
    ['signals', 'Signals', 'B'],
    ['findings', 'Findings', 'C'],
    ['pages', 'Pages', 'D'],
    ['vendors', 'Vendors', 'E'],
    ['evidence', 'Evidence', 'F'],
  ] as const;

  function scrollTo(id: string) {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const duration = report.startedAt && report.finishedAt
    ? (() => {
        const ms = new Date(report.finishedAt).getTime() - new Date(report.startedAt).getTime();
        const s = Math.floor(ms / 1000);
        return `${Math.floor(s / 60)}m ${s % 60}s`;
      })()
    : '—';

  return (
    <div>
      {/* Report header */}
      <div style={{ background: C.paper, borderBottom: `1px solid ${C.hairline}`, padding: '24px 32px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ marginBottom: 10 }}>
            <Breadcrumb items={[
              { label: 'Projects', href: '/' },
              { label: report.projectId, href: `/projects/${report.projectId}` },
              { label: `Scan ${scanId.slice(0, 8)}` },
            ]} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontFamily: F.serif, fontSize: 40, fontWeight: 500, margin: 0, color: C.ink, letterSpacing: -0.8, lineHeight: 1.05 }}>
                Audit report · {report.rootUrl}
              </h1>
              <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <StatusBadge status="completed" />
                <span style={{ fontFamily: F.mono, fontSize: 11, color: C.slate }}>
                  {scanId} · {new Date(report.startedAt).toLocaleString('en-CA', { hour12: false })} · {duration} · {report.pages.length} pages · {report.findings.length} findings
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link href={`/projects/${report.projectId}`} style={{
                height: 36, padding: '0 16px', background: 'transparent', color: C.ink,
                border: `1px solid ${C.hairline}`, fontFamily: F.mono, fontSize: 11,
                fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', textDecoration: 'none',
              }}>
                ← PROJECT
              </Link>
              <a href={`${API_URL}/scans/${scanId}/report.json`} target="_blank" rel="noreferrer" style={{
                height: 36, padding: '0 16px', background: C.paper, color: C.ink,
                border: `1px solid ${C.ink}`, fontFamily: F.mono, fontSize: 11,
                fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', textDecoration: 'none',
              }}>
                ⤓ JSON
              </a>
              <a href={`${API_URL}/scans/${scanId}/report.pdf`} target="_blank" rel="noreferrer" style={{
                height: 36, padding: '0 16px', background: C.ink, color: C.sand,
                border: `1px solid ${C.ink}`, fontFamily: F.mono, fontSize: 11,
                fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', textDecoration: 'none',
              }}>
                ⤓ DOWNLOAD PDF
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column content */}
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '220px 1fr', gap: 0 }}>
        {/* Left nav */}
        <aside style={{
          padding: '32px 16px 32px 32px',
          borderRight: `1px solid ${C.hairline}`,
          position: 'sticky',
          top: 56,
          alignSelf: 'flex-start',
          height: 'calc(100vh - 56px)',
          overflow: 'hidden',
        }}>
          <div style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 600, letterSpacing: 1.5, color: C.slate, marginBottom: 12 }}>
            REPORT SECTIONS
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {sections.map(([id, label, tag]) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  fontFamily: F.mono,
                  fontSize: 12,
                  fontWeight: 500,
                  color: activeSection === id ? C.ink : C.slate,
                  background: activeSection === id ? C.sandDeep : 'transparent',
                  borderTop: 'none',
                  borderRight: 'none',
                  borderBottom: 'none',
                  borderLeft: activeSection === id ? `2px solid ${C.rust}` : '2px solid transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  letterSpacing: 0.3,
                  width: '100%',
                }}
              >
                <span style={{ fontFamily: F.mono, fontSize: 10, color: C.slate60, fontWeight: 700 }}>{tag}</span>
                {label}
              </button>
            ))}
          </nav>

          <div style={{ marginTop: 32, paddingTop: 20, borderTop: `1px solid ${C.hairline}`, fontFamily: F.mono, fontSize: 10, color: C.slate, lineHeight: 1.7 }}>
            <div style={{ color: C.slate60, letterSpacing: 1, marginBottom: 8 }}>ISSUED BY</div>
            <div style={{ color: C.ink, fontWeight: 600 }}>audit.firm</div>
            <div>PRA build 2026.04</div>
            <div style={{ marginTop: 12, color: C.slate60, letterSpacing: 1 }}>SCAN ID</div>
            <div style={{ color: C.ink, fontWeight: 600, wordBreak: 'break-all' }}>{scanId.slice(0, 12)}</div>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ padding: '32px 32px 96px', minWidth: 0 }}>

          {/* A · SCORES */}
          <SectionHeader id="scores" tag="A" title="Score summary" caption="5 dimensions · weighted avg" />
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr',
            gap: 1,
            background: C.hairline,
            border: `1px solid ${C.hairline}`,
            marginBottom: 48,
          }}>
            <ScoreCard primary label="Overall" value={report.scores.overall} />
            <ScoreCard label="Pre-consent" value={report.scores.preConsentBehavior} />
            <ScoreCard label="Consent UX" value={report.scores.consentUx} />
            <ScoreCard label="Blocking" value={report.scores.runtimeBlockingEffectiveness} />
            <ScoreCard label="Policy" value={report.scores.policyRuntimeAlignment} />
          </div>

          {/* B · SIGNALS */}
          <SectionHeader id="signals" tag="B" title="Privacy signals" caption="runtime detection heuristics" />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 16,
            marginBottom: 48,
          }}>
            {[
              ['Ad trackers', report.privacySignals.adTrackers],
              ['Third-party cookies', report.privacySignals.thirdPartyCookies],
              ['Cookie blocker evasion', report.privacySignals.cookieBlockerEvasion],
              ['Canvas fingerprinting', report.privacySignals.canvasFingerprinting],
              ['Session recorders', report.privacySignals.sessionRecorders],
              ['Keystroke capture', report.privacySignals.keystrokeCapture],
              ['Facebook Pixel', report.privacySignals.facebookPixel],
              ['TikTok Pixel', report.privacySignals.tiktokPixel],
              ['X Pixel', report.privacySignals.xPixel],
              ['GA remarketing', report.privacySignals.googleAnalyticsRemarketing],
            ].map(([label, signal]) => (
              <SignalCard key={String(label)} label={String(label)} signal={signal as ScanReport['privacySignals'][keyof ScanReport['privacySignals']]} />
            ))}
          </div>

          {/* C · FINDINGS */}
          <SectionHeader
            id="findings"
            tag="C"
            title={`Findings (${report.findings.length})`}
            caption={`${report.findings.filter((f) => f.severity === 'critical').length} critical · ${report.findings.filter((f) => f.severity === 'high').length} high`}
            right={
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontFamily: F.mono, fontSize: 10, color: C.slate, letterSpacing: 0.5, marginRight: 4 }}>SEVERITY ·</span>
                {(['critical', 'high', 'medium', 'low', 'info'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSevFilter((prev) => {
                      const n = new Set(prev);
                      if (n.has(s)) { n.delete(s); } else { n.add(s); }
                      return n;
                    })}
                    style={{
                      padding: '4px 8px',
                      cursor: 'pointer',
                      background: sevFilter.has(s) ? C.ink : 'transparent',
                      color: sevFilter.has(s) ? C.sand : C.slate,
                      border: `1px solid ${sevFilter.has(s) ? C.ink : C.hairline}`,
                      fontFamily: F.mono,
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: 0.8,
                    }}
                  >
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>
            }
          />
          <div style={{ borderTop: `1px solid ${C.ink}`, marginBottom: 48 }}>
            {shownFindings.length === 0 ? (
              <div style={{ padding: '24px 4px', fontFamily: F.mono, fontSize: 12, color: C.slate60 }}>
                No findings match the current severity filter.
              </div>
            ) : shownFindings.map((f) => (
              <FindingRow
                key={f.id}
                finding={f}
                open={openFindings.has(f.id)}
                toggle={() => setOpenFindings((s) => {
                  const n = new Set(s);
                  if (n.has(f.id)) { n.delete(f.id); } else { n.add(f.id); }
                  return n;
                })}
              />
            ))}
          </div>

          {/* D · PAGES */}
          <SectionHeader id="pages" tag="D" title="Pages scanned" caption={`${report.pages.length} pages · 4 scenarios each`} />
          <div style={{ border: `1px solid ${C.hairline}`, background: C.paper, marginBottom: 48 }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.6fr 100px repeat(4, 80px) 80px',
              padding: '10px 16px',
              background: C.sandDeep,
              fontFamily: F.mono,
              fontSize: 9,
              letterSpacing: 1,
              color: C.slate,
              fontWeight: 600,
              borderBottom: `1px solid ${C.hairline}`,
            }}>
              <span>URL</span>
              <span>KIND</span>
              <span style={{ textAlign: 'center' }}>NO-CON</span>
              <span style={{ textAlign: 'center' }}>ACCEPT</span>
              <span style={{ textAlign: 'center' }}>REJECT</span>
              <span style={{ textAlign: 'center' }}>GRANUL</span>
              <span style={{ textAlign: 'right' }}>ARTIF.</span>
            </div>
            {report.pages.map((page, i) => {
              const scenarios = ['no-consent', 'accept-all', 'reject-all', 'granular'].map((type) =>
                page.scenarioResults.find((s) => s.scenarioType === type),
              );
              return (
                <div key={page.url}>
                  <div
                    onClick={() => setExpandedPage(expandedPage === page.url ? null : page.url)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.6fr 100px repeat(4, 80px) 80px',
                      padding: '12px 16px',
                      alignItems: 'center',
                      borderBottom: i < report.pages.length - 1 || expandedPage === page.url ? `1px solid ${C.hairline}` : 'none',
                      cursor: 'pointer',
                      background: expandedPage === page.url ? C.sandDeep + '55' : 'transparent',
                    }}
                  >
                    <span title={`${report.rootUrl}${page.url}`} style={{
                      fontFamily: F.mono, fontSize: 12, color: C.ink, fontWeight: 500,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 8,
                    }}>
                      {page.url}
                    </span>
                    <span style={{
                      fontFamily: F.mono, fontSize: 9, fontWeight: 700, letterSpacing: 0.8,
                      color: C.slate, border: `1px solid ${C.hairline}`, padding: '2px 6px',
                      display: 'inline-block',
                    }}>
                      {page.pageKind.toUpperCase()}
                    </span>
                    {scenarios.map((s, j) => (
                      <ScenarioCell key={j} status={s?.status ?? 'unknown'} count={s?.artifacts.length ?? 0} />
                    ))}
                    <span style={{ fontFamily: F.mono, fontSize: 12, color: C.ink70, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {page.scenarioResults.reduce((a, s) => a + s.artifacts.length, 0)}
                    </span>
                  </div>
                  {expandedPage === page.url && (
                    <div style={{
                      padding: '16px 24px 20px 16px',
                      background: C.sand,
                      borderBottom: `1px solid ${C.hairline}`,
                      fontFamily: F.mono, fontSize: 11, color: C.ink70, lineHeight: 1.8,
                    }}>
                      <div style={{ color: C.slate, letterSpacing: 0.5, marginBottom: 6 }}>SCENARIOS DETAIL</div>
                      {page.scenarioResults.map((s) => (
                        <div key={s.scenarioType}>
                          <span style={{ color: C.slate60, minWidth: 120, display: 'inline-block' }}>{s.scenarioType}</span>
                          {' '}status: {s.status} · {s.artifacts.length} artifacts · banner {s.consent.present ? 'detected' : 'not detected'}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* E · VENDORS */}
          <SectionHeader id="vendors" tag="E" title="Vendors & policy" caption="observed runtime vs. declared policy" />
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            border: `1px solid ${C.hairline}`,
            marginBottom: 48,
            background: C.paper,
          }}>
            <div style={{ padding: 20, borderRight: `1px solid ${C.hairline}` }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
                <h3 style={{ fontFamily: F.serif, fontSize: 18, fontWeight: 500, margin: 0 }}>Observed vendors</h3>
                <span style={{ fontFamily: F.mono, fontSize: 10, color: C.slate }}>n={vendors.length}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {vendors.map((v) => {
                  const undeclared = !declaredVendors.has(v);
                  return (
                    <span key={v} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '4px 8px',
                      background: undeclared ? C.rustBg : C.sandDeep,
                      color: undeclared ? '#7A1F15' : C.ink,
                      border: `1px solid ${undeclared ? C.rust + '55' : C.hairlineStrong}`,
                      fontFamily: F.mono, fontSize: 11, fontWeight: 500,
                    }}>
                      {v.length > 24 ? v.slice(0, 23) + '…' : v}
                      {undeclared && (
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, padding: '1px 4px', background: C.rust, color: '#fff' }}>
                          UNDECLARED
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
                <h3 style={{ fontFamily: F.serif, fontSize: 18, fontWeight: 500, margin: 0 }}>Policy declarations</h3>
                <span style={{ fontFamily: F.mono, fontSize: 10, color: C.slate }}>{report.policies.length} docs</span>
              </div>
              {report.policies.length === 0 ? (
                <div style={{ fontFamily: F.mono, fontSize: 11, color: C.slate60 }}>No policy documents discovered.</div>
              ) : report.policies.map((policy) => (
                <div key={policy.url} style={{ padding: '12px 0', borderTop: `1px solid ${C.hairline}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 700, letterSpacing: 1, padding: '2px 6px', background: C.ink, color: C.sand }}>
                      {policy.type.toUpperCase()}
                    </span>
                    <span style={{ fontFamily: F.mono, fontSize: 12, color: C.ink }}>{policy.url}</span>
                  </div>
                  <div style={{ fontFamily: F.mono, fontSize: 11, color: C.slate }}>
                    declared vendors: {policy.extracted.vendors.length} · categories: {policy.extracted.categories.join(', ') || 'none'}
                  </div>
                </div>
              ))}
              {vendors.some((v) => !declaredVendors.has(v)) && (
                <div style={{ marginTop: 20, padding: 14, background: C.rustBg, borderLeft: `3px solid ${C.rust}` }}>
                  <div style={{ fontFamily: F.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1, color: C.rust, marginBottom: 4 }}>⚑ MISMATCH</div>
                  <div style={{ fontSize: 13, color: '#5A1810', lineHeight: 1.5 }}>
                    Vendors observed at runtime are not declared in any policy document. See highlighted pills.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* F · EVIDENCE */}
          <SectionHeader id="evidence" tag="F" title="Evidence & regression delta" caption={report.diff ? 'vs. baseline scan' : 'no baseline set'} />
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            border: `1px solid ${C.hairline}`,
            background: C.paper,
            marginBottom: 48,
          }}>
            <div style={{ padding: 20, borderRight: `1px solid ${C.hairline}` }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
                <h3 style={{ fontFamily: F.serif, fontSize: 18, fontWeight: 500, margin: 0 }}>Evidence artifacts</h3>
              </div>
              {report.pages.flatMap((p) => p.scenarioResults).slice(0, 6).map((s, idx) => (
                <div key={`${s.scenarioType}-${idx}`} style={{
                  display: 'grid', gridTemplateColumns: '60px 1fr 80px',
                  gap: 10, alignItems: 'center', padding: '10px 0',
                  borderTop: `1px solid ${C.hairline}`,
                }}>
                  <span style={{
                    fontFamily: F.mono, fontSize: 9, fontWeight: 700, background: C.ink,
                    color: C.sand, padding: '3px 6px', letterSpacing: 0.5, textAlign: 'center',
                  }}>
                    {s.scenarioType.slice(0, 3).toUpperCase()}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: F.mono, fontSize: 12, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.screenshotPath ?? `scenario-${s.scenarioType}`}
                    </div>
                    <div style={{ fontFamily: F.mono, fontSize: 10, color: C.slate60 }}>
                      {s.artifacts.length} artifacts · banner {s.consent.present ? 'present' : 'absent'}
                    </div>
                  </div>
                  <span style={{ fontFamily: F.mono, fontSize: 10, color: C.slate }}>{s.status}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
                <h3 style={{ fontFamily: F.serif, fontSize: 18, fontWeight: 500, margin: 0 }}>Regression delta</h3>
                {report.diff && <StatusBadge status="baseline" />}
              </div>
              {report.diff ? (
                <>
                  <DeltaList tone="rust" title="New vendors" items={report.diff.newVendors} />
                  <DeltaList tone="rust" title="New cookies" items={report.diff.newCookies} />
                  <DeltaList tone="rust" title="New failures" items={report.diff.newFailures} />
                  <DeltaList tone="moss" title="Resolved findings" items={report.diff.resolvedFindings} />
                </>
              ) : (
                <div style={{ fontFamily: F.mono, fontSize: 11, color: C.slate60, lineHeight: 1.7 }}>
                  No baseline diff available yet. After a second scan is completed, regression data will appear here.
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{
            paddingTop: 24,
            borderTop: `1px solid ${C.hairline}`,
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: F.mono,
            fontSize: 10,
            color: C.slate60,
            letterSpacing: 0.5,
          }}>
            <span>END OF REPORT · {report.scanId}</span>
            <span>PRA · LEGAL-GRADE · {report.finishedAt}</span>
          </div>
        </main>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({
  id, tag, title, caption, right,
}: {
  id: string; tag: string; title: string; caption?: string; right?: ReactNode;
}) {
  return (
    <div id={id} style={{
      display: 'flex', alignItems: 'baseline', gap: 16,
      paddingBottom: 12, marginBottom: 20,
      borderBottom: `1px solid ${C.ink}`,
      flexWrap: 'wrap',
    }}>
      <span style={{ fontFamily: F.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: C.slate60 }}>§ {tag}</span>
      <h2 style={{ fontFamily: F.serif, fontSize: 26, fontWeight: 500, margin: 0, letterSpacing: -0.4 }}>{title}</h2>
      {caption && <span style={{ fontFamily: F.mono, fontSize: 11, color: C.slate }}>{caption}</span>}
      <div style={{ flex: 1 }} />
      {right}
    </div>
  );
}

function FindingRow({ finding, open, toggle }: {
  finding: ScanReport['findings'][number];
  open: boolean;
  toggle: () => void;
}) {
  return (
    <div style={{ borderBottom: `1px solid ${C.hairline}`, background: open ? C.paper : 'transparent' }}>
      <button
        onClick={toggle}
        style={{
          width: '100%', padding: '16px 4px',
          display: 'grid', gridTemplateColumns: '20px 80px 100px 1fr auto',
          gap: 16, alignItems: 'center',
          background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontFamily: F.mono, fontSize: 14, color: C.slate, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s', display: 'inline-block' }}>›</span>
        <span style={{ fontFamily: F.mono, fontSize: 13, fontWeight: 600, color: C.ink, letterSpacing: 0.5 }}>{finding.ruleCode}</span>
        <SeverityBadge severity={finding.severity} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.ink, lineHeight: 1.35 }}>{finding.title}</div>
          <div style={{ fontSize: 12, color: C.slate, marginTop: 4, lineHeight: 1.5 }}>{finding.summary}</div>
        </div>
        <span style={{ fontFamily: F.mono, fontSize: 10, color: C.slate60, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
          {open ? 'COLLAPSE' : 'EXPAND'}
        </span>
      </button>
      {open && (
        <div style={{ padding: '0 4px 20px 120px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32 }}>
          <div style={{ fontSize: 14, color: C.ink70, lineHeight: 1.6, maxWidth: 640 }}>
            <div style={{ fontFamily: F.mono, fontSize: 10, color: C.slate, letterSpacing: 1, marginBottom: 6 }}>DESCRIPTION</div>
            {finding.description}
            <div style={{ marginTop: 16, padding: '10px 14px', background: C.sand, fontFamily: F.mono, fontSize: 11, color: C.ink70, lineHeight: 1.6 }}>
              <span style={{ color: C.slate, letterSpacing: 0.5 }}>EVIDENCE · </span>
              {finding.evidence.map((ev) => ev.label).join(' · ')}
            </div>
          </div>
          {finding.remediation && (
            <div style={{ borderLeft: `3px solid ${C.moss}`, padding: '12px 16px', background: C.mossBg + '80', fontStyle: 'italic' }}>
              <div style={{ fontFamily: F.mono, fontSize: 10, color: '#1E5622', letterSpacing: 1, marginBottom: 6, fontStyle: 'normal', fontWeight: 700 }}>
                ☐ REMEDIATION HINT
              </div>
              <div style={{ fontSize: 13, color: '#1E3618', lineHeight: 1.5 }}>{finding.remediation}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScenarioCell({ status, count }: { status: string; count: number }) {
  const map: Record<string, { bg: string; fg: string; m: string }> = {
    completed: { bg: C.mossBg,   fg: C.moss,   m: '✓' },
    failed:    { bg: C.rustBg,   fg: C.rust,   m: '✕' },
    skipped:   { bg: C.orangeBg, fg: C.orange, m: '◐' },
  };
  const s = map[status] ?? { bg: C.sandDeep, fg: C.slate, m: '?' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '4px 0' }}>
      <span style={{
        width: 22, height: 22, background: s.bg, color: s.fg,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700,
      }}>
        {s.m}
      </span>
      <span style={{ fontFamily: F.mono, fontSize: 10, color: C.slate60 }}>{count}</span>
    </div>
  );
}

function SignalCard({
  label,
  signal,
}: {
  label: string;
  signal: ScanReport['privacySignals'][keyof ScanReport['privacySignals']];
}) {
  return (
    <div style={{
      border: `1px solid ${signal.detected ? C.rust + '44' : C.hairline}`,
      background: signal.detected ? C.rustBg + '88' : C.paper,
      padding: 18,
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{
          width: 10,
          height: 10,
          background: signal.detected ? C.rust : C.moss,
          display: 'inline-block',
        }} />
        <span style={{ fontFamily: F.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1, color: C.slate60 }}>
          {label.toUpperCase()}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: F.mono, fontSize: 10, color: C.slate }}>{signal.count}</span>
      </div>
      <div style={{ fontSize: 15, lineHeight: 1.45, color: C.ink, marginBottom: signal.entities.length > 0 ? 10 : 0 }}>
        {signal.summary}
      </div>
      {signal.entities.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {signal.entities.slice(0, 6).map((entity) => (
            <span key={entity} style={{
              padding: '4px 7px',
              background: C.sandDeep,
              border: `1px solid ${C.hairline}`,
              fontFamily: F.mono,
              fontSize: 10,
              color: C.ink70,
            }}>
              {entity}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function DeltaList({ tone, title, items }: { tone: 'rust' | 'moss'; title: string; items: string[] }) {
  const col = tone === 'rust' ? C.rust : C.moss;
  const bg = tone === 'rust' ? C.rustBg : C.mossBg;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ width: 10, height: 10, background: col, display: 'inline-block' }} />
        <span style={{ fontFamily: F.mono, fontSize: 10, fontWeight: 700, color: col, letterSpacing: 1 }}>
          {title.toUpperCase()}
        </span>
        <span style={{ fontFamily: F.mono, fontSize: 10, color: C.slate60 }}>+{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div style={{ fontFamily: F.mono, fontSize: 11, color: C.slate60, paddingLeft: 18 }}>None</div>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {items.map((x, i) => (
            <li key={i} style={{
              fontFamily: F.mono, fontSize: 12, color: C.ink70,
              padding: '4px 10px', borderLeft: `2px solid ${col}55`,
              background: bg + '60', marginBottom: 2,
            }}>
              {x}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
