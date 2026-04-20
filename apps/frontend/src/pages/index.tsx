import Link from 'next/link';
import { useRouter } from 'next/router';
import { FormEvent, useEffect, useState } from 'react';

import { Layout } from '../components/layout';
import { Panel } from '../components/panel';
import { createProject, fetchProjects, startScan, type ProjectSummary } from '../lib/api';

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState('Primary Website');
  const [rootUrl, setRootUrl] = useState('https://example.com');
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchProjects().then(setProjects).catch((requestError: Error) => setError(requestError.message));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const project = await createProject({ name, rootUrl });
      const scan = await startScan(project.id);
      await router.push(`/scans/${scan.id}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create a project and scan.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="grid gap-6 lg:grid-cols-[1.35fr,0.9fr]">
        <Panel className="overflow-hidden" eyebrow="Launch Audit" title="Scan a website from a single URL">
          <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
            <div>
              <p className="max-w-xl text-sm leading-7 text-ink/70">
                Privacy Runtime Auditor verifies what a site does before consent, after accept, after reject, and after granular choices. Reports are evidence-first and built for developers, privacy consultants, and compliance teams.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  ['4 scenarios', 'No consent, accept all, reject all, granular controls'],
                  ['15 pages max', 'Bounded discovery keeps scans deterministic and reproducible'],
                  ['JSON + PDF', 'Reports remain transparent and exportable'],
                ].map(([headline, copy]) => (
                  <div className="rounded-xl border border-black/10 bg-white/60 p-4" key={headline}>
                    <p className="text-sm font-semibold text-ink">{headline}</p>
                    <p className="mt-2 text-sm leading-6 text-ink/60">{copy}</p>
                  </div>
                ))}
              </div>
            </div>
            <form className="rounded-[1.5rem] border border-black/10 bg-ink p-5 text-white" onSubmit={onSubmit}>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sand">New Runtime Audit</p>
              <label className="mt-5 block text-sm font-medium text-white/90">
                Project name
                <input className="mt-2 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-sand" value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <label className="mt-4 block text-sm font-medium text-white/90">
                Root URL
                <input className="mt-2 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-sand" value={rootUrl} onChange={(event) => setRootUrl(event.target.value)} />
              </label>
              <button className="mt-5 w-full rounded-full bg-slate px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white" disabled={loading} type="submit">
                {loading ? 'Preparing scan...' : 'Create project and start scan'}
              </button>
              {error ? <p className="mt-4 text-sm text-rose-200">{error}</p> : null}
            </form>
          </div>
        </Panel>

        <Panel eyebrow="Recent Projects" title="Continue from an existing audit">
          <div className="space-y-3">
            {projects.length === 0 ? (
              <p className="text-sm leading-7 text-ink/60">No projects have been created yet. Start with a root URL and the app will open the live scan view immediately.</p>
            ) : (
              projects.map((project) => (
                <Link className="block rounded-xl border border-black/10 bg-white/70 p-4 transition hover:border-rust" href={`/projects/${project.id}`} key={project.id}>
                  <p className="text-sm font-semibold text-ink">{project.name}</p>
                  <p className="mt-1 text-sm text-ink/60">{project.rootUrl}</p>
                </Link>
              ))
            )}
          </div>
        </Panel>
      </div>
    </Layout>
  );
}
