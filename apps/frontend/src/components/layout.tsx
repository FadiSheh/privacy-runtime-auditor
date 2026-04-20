import Link from 'next/link';
import type { PropsWithChildren } from 'react';

export function Layout({ children }: PropsWithChildren) {
  return (
    <div className="grid-lines min-h-screen px-4 py-6 text-ink sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="panel shadow-panel flex items-center justify-between rounded-xl border border-black/10 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rust">Privacy Runtime Auditor</p>
            <h1 className="text-lg font-semibold text-ink">Runtime evidence for consent behavior</h1>
          </div>
          <nav className="flex items-center gap-3 text-sm text-ink/70">
            <Link className="rounded-full border border-black/10 px-3 py-1.5 transition hover:border-rust hover:text-rust" href="/">
              Overview
            </Link>
            <Link className="rounded-full border border-black/10 px-3 py-1.5 transition hover:border-rust hover:text-rust" href="/login">
              Login
            </Link>
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
