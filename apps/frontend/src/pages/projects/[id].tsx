import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

import { Layout } from '../../components/layout';
import { Panel } from '../../components/panel';
import { fetchProject, fetchProjectScans, startScan } from '../../lib/api';

export default function ProjectPage() {
  const router = useRouter();
  const projectId = typeof router.query.id === 'string' ? router.query.id : '';
  const [project, setProject] = useState<{ id: string; name: string; rootUrl: string } | null>(null);
  const [scans, setScans] = useState<Array<{ id: string; status: string; overallScore: number | null; startedAt: string | null }>>([]);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    void fetchProject(projectId).then(setProject);
    void fetchProjectScans(projectId).then(setScans);
  }, [projectId]);

  async function runScan() {
    if (!projectId) {
      return;
    }

    const scan = await startScan(projectId);
    await router.push(`/scans/${scan.id}`);
  }

  return (
    <Layout>
      <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <Panel eyebrow="Project" title={project?.name ?? 'Loading project...'} action={<button className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-rust" onClick={() => void runScan()} type="button">Start new scan</button>}>
          <p className="text-sm text-ink/65">{project?.rootUrl ?? 'Resolving project root URL...'}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-black/10 bg-white/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/50">Scans</p>
              <p className="mt-2 text-3xl font-semibold text-ink">{scans.length}</p>
            </div>
            <div className="rounded-xl border border-black/10 bg-white/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/50">Latest status</p>
              <p className="mt-2 text-lg font-semibold capitalize text-ink">{scans[0]?.status ?? 'none'}</p>
            </div>
            <div className="rounded-xl border border-black/10 bg-white/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/50">Latest score</p>
              <p className="mt-2 text-lg font-semibold text-ink">{scans[0]?.overallScore ?? 'Pending'}</p>
            </div>
          </div>
        </Panel>

        <Panel eyebrow="History" title="Recent scans">
          <div className="space-y-3">
            {scans.map((scan) => (
              <Link className="block rounded-xl border border-black/10 bg-white/70 p-4 transition hover:border-rust" href={`/scans/${scan.id}`} key={scan.id}>
                <p className="text-sm font-semibold capitalize text-ink">{scan.status}</p>
                <p className="mt-1 text-sm text-ink/60">{scan.startedAt ? new Date(scan.startedAt).toLocaleString() : 'Queued'}</p>
              </Link>
            ))}
            {scans.length === 0 ? <p className="text-sm text-ink/60">No scans yet for this project.</p> : null}
          </div>
        </Panel>
      </div>
    </Layout>
  );
}
