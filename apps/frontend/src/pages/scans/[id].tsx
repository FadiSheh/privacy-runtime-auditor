import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';

import { Layout } from '../../components/layout';
import { Panel } from '../../components/panel';
import { ScoreCard } from '../../components/score-card';
import { SeverityBadge } from '../../components/severity-badge';
import { fetchScanReport, fetchScanStatus, type ScanReport, type ScanStatus } from '../../lib/api';

function usePollingScan(scanId: string) {
  const [status, setStatus] = useState<ScanStatus | null>(null);
  const [report, setReport] = useState<ScanReport | null>(null);

  useEffect(() => {
    if (!scanId) {
      return;
    }

    let active = true;
    let timer: NodeJS.Timeout | undefined;

    const tick = async () => {
      const nextStatus = await fetchScanStatus(scanId);
      if (!active) {
        return;
      }
      setStatus(nextStatus);

      if (nextStatus.status === 'completed') {
        const nextReport = await fetchScanReport(scanId);
        if (active) {
          setReport(nextReport);
        }
        return;
      }

      if (nextStatus.status !== 'failed') {
        timer = setTimeout(() => {
          void tick();
        }, 2500);
      }
    };

    void tick();

    return () => {
      active = false;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [scanId]);

  return { status, report };
}

export default function ScanPage() {
  const router = useRouter();
  const scanId = typeof router.query.id === 'string' ? router.query.id : '';
  const { status, report } = usePollingScan(scanId);

  const vendors = useMemo(() => {
    if (!report) {
      return [] as string[];
    }

    return Array.from(
      new Set(
        report.pages.flatMap((page) =>
          page.scenarioResults.flatMap((scenario) =>
            scenario.artifacts.map((artifact) => artifact.vendorName).filter((value): value is string => Boolean(value)),
          ),
        ),
      ),
    );
  }, [report]);

  return (
    <Layout>
      <div className="grid gap-6">
        <Panel
          eyebrow="Live Scan"
          title={report ? 'Audit complete' : 'Scanning in progress'}
          action={
            report ? (
              <div className="flex gap-2">
                <a className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-ink transition hover:border-rust hover:text-rust" href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/scans/${scanId}/report.json`} target="_blank" rel="noreferrer">
                  JSON report
                </a>
                <a className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-rust" href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/scans/${scanId}/report.pdf`} target="_blank" rel="noreferrer">
                  PDF report
                </a>
              </div>
            ) : null
          }
        >
          <div className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
            <div className="rounded-[1.5rem] border border-black/10 bg-ink p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sand">Status</p>
              <p className="mt-4 text-4xl font-semibold capitalize">{status?.status ?? 'queued'}</p>
              <p className="mt-3 text-sm text-white/70">{report ? report.rootUrl : 'Waiting for the worker to discover pages, run scenarios, and evaluate rules.'}</p>
              <div className="mt-6 rounded-full bg-white/10 p-1">
                <div className="h-2 rounded-full bg-sand transition-all" style={{ width: `${status?.progress ?? 0}%` }} />
              </div>
              <p className="mt-3 text-sm text-white/70">{status?.progress ?? 0}% complete · {status?.completedScenarios ?? 0}/{status?.totalScenarios ?? 0} scenarios</p>
            </div>
            {report ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <ScoreCard label="Overall" value={report.scores.overall} />
                <ScoreCard label="Pre-consent" value={report.scores.preConsentBehavior} />
                <ScoreCard label="Consent UX" value={report.scores.consentUx} />
                <ScoreCard label="Blocking" value={report.scores.runtimeBlockingEffectiveness} />
                <ScoreCard label="Policy" value={report.scores.policyRuntimeAlignment} />
              </div>
            ) : null}
          </div>
        </Panel>

        {report ? (
          <>
            <div className="grid gap-6 lg:grid-cols-[1.25fr,0.75fr]">
              <Panel eyebrow="Findings" title="Technical findings with evidence">
                <div className="space-y-4">
                  {report.findings.map((finding) => (
                    <article className="rounded-xl border border-black/10 bg-white/70 p-4" key={finding.id}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink/45">{finding.ruleCode}</p>
                          <h3 className="mt-1 text-lg font-semibold text-ink">{finding.title}</h3>
                        </div>
                        <SeverityBadge severity={finding.severity} />
                      </div>
                      <p className="mt-3 text-sm leading-7 text-ink/70">{finding.summary}</p>
                      <p className="mt-2 text-sm leading-7 text-ink/60">{finding.remediation}</p>
                    </article>
                  ))}
                </div>
              </Panel>

              <Panel eyebrow="Overview" title="Runtime summary">
                <dl className="space-y-3 text-sm text-ink/70">
                  <div className="flex justify-between gap-4 border-b border-black/10 pb-3">
                    <dt>Pages scanned</dt>
                    <dd className="font-semibold text-ink">{report.pages.length}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-black/10 pb-3">
                    <dt>Vendors observed</dt>
                    <dd className="font-semibold text-ink">{vendors.length}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-black/10 pb-3">
                    <dt>Risk level</dt>
                    <dd className="font-semibold capitalize text-ink">{report.riskLevel}</dd>
                  </div>
                  <div className="flex justify-between gap-4 pb-3">
                    <dt>Policy pages</dt>
                    <dd className="font-semibold text-ink">{report.policies.length}</dd>
                  </div>
                </dl>
              </Panel>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Panel eyebrow="Pages" title="Scenario coverage by page">
                <div className="space-y-4">
                  {report.pages.map((page) => (
                    <article className="rounded-xl border border-black/10 bg-white/70 p-4" key={page.url}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">{page.pageKind}</p>
                          <h3 className="mt-1 text-sm font-semibold text-ink">{page.url}</h3>
                        </div>
                        <span className="text-xs uppercase tracking-[0.22em] text-ink/45">{page.scenarioResults.length} scenarios</span>
                      </div>
                      <div className="mt-3 grid gap-2">
                        {page.scenarioResults.map((scenario) => (
                          <div className="rounded-xl border border-black/10 bg-slate/70 px-3 py-2 text-sm text-ink/70" key={`${page.url}-${scenario.scenarioType}`}>
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold text-ink">{scenario.scenarioType}</span>
                              <span className="capitalize">{scenario.status}</span>
                            </div>
                            <p className="mt-2 text-xs text-ink/55">{scenario.artifacts.length} artifacts · banner {scenario.consent.present ? 'detected' : 'not detected'}</p>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </Panel>

              <Panel eyebrow="Vendors & Policy" title="Declared vs observed runtime behavior">
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-ink/50">Observed vendors</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {vendors.map((vendor) => (
                        <span className="rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-sm text-ink/70" key={vendor}>{vendor}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-ink/50">Policy declarations</h3>
                    <div className="mt-3 space-y-3">
                      {report.policies.map((policy) => (
                        <div className="rounded-xl border border-black/10 bg-white/70 p-4" key={policy.url}>
                          <p className="text-sm font-semibold capitalize text-ink">{policy.type} policy</p>
                          <p className="mt-1 text-sm text-ink/60">{policy.url}</p>
                          <p className="mt-3 text-sm text-ink/70">Vendors: {policy.extracted.vendors.join(', ') || 'None extracted'}</p>
                          <p className="mt-1 text-sm text-ink/70">Categories: {policy.extracted.categories.join(', ') || 'None extracted'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Panel>
            </div>

            <Panel eyebrow="Evidence" title="Raw evidence paths and diff summary">
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-ink/50">Runtime evidence</h3>
                  <div className="mt-3 space-y-3">
                    {report.pages.flatMap((page) => page.scenarioResults).slice(0, 8).map((scenario, index) => (
                      <div className="rounded-xl border border-black/10 bg-white/70 p-4" key={`${scenario.scenarioType}-${index}`}>
                        <p className="text-sm font-semibold text-ink">{scenario.scenarioType}</p>
                        <p className="mt-1 text-sm text-ink/60">Screenshot: {scenario.screenshotPath ?? 'Not captured'}</p>
                        <p className="mt-1 text-sm text-ink/60">Consent limitations: {scenario.consent.limitations.join(', ') || 'None recorded'}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-ink/50">Baseline / history</h3>
                  {report.diff ? (
                    <div className="mt-3 rounded-xl border border-black/10 bg-white/70 p-4 text-sm text-ink/70">
                      <p>New vendors: {report.diff.newVendors.join(', ') || 'None'}</p>
                      <p className="mt-2">New cookies: {report.diff.newCookies.join(', ') || 'None'}</p>
                      <p className="mt-2">New failures: {report.diff.newFailures.join(', ') || 'None'}</p>
                      <p className="mt-2">Resolved findings: {report.diff.resolvedFindings.join(', ') || 'None'}</p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-ink/60">No baseline diff is available yet for this project. A later completed scan will establish comparison data.</p>
                  )}
                </div>
              </div>
            </Panel>
          </>
        ) : (
          <Panel eyebrow="Progress" title="Worker activity">
            <p className="text-sm leading-7 text-ink/65">The scan view polls the API until the worker completes discovery, scenario execution, policy extraction, rules, and reporting. Keep this tab open or return from the <Link className="text-rust underline underline-offset-4" href="/">main console</Link>.</p>
          </Panel>
        )}
      </div>
    </Layout>
  );
}
