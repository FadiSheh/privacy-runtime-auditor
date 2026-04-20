import Link from 'next/link';
import { useRouter } from 'next/router';
import { FormEvent, useState } from 'react';

import { Layout } from '../components/layout';
import { Panel } from '../components/panel';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('demo@pra.local');
  const [password, setPassword] = useState('demo-password');

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    localStorage.setItem('pra-demo-session', JSON.stringify({ email }));
    void router.push('/');
  }

  return (
    <Layout>
      <div className="mx-auto w-full max-w-xl">
        <Panel eyebrow="Demo Access" title="Open the runtime audit console">
          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="block text-sm font-medium text-ink">
              Email
              <input className="mt-2 w-full rounded-xl border border-black/10 bg-white/70 px-4 py-3 outline-none ring-0 transition focus:border-rust" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="block text-sm font-medium text-ink">
              Password
              <input className="mt-2 w-full rounded-xl border border-black/10 bg-white/70 px-4 py-3 outline-none ring-0 transition focus:border-rust" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <button className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-rust" type="submit">
              Continue with demo account
            </button>
          </form>
          <p className="mt-4 text-sm text-ink/60">
            This MVP focuses on the core scan flow. Authentication is a lightweight demo gate for local use.
          </p>
          <p className="mt-3 text-sm text-ink/60">
            <Link className="text-rust underline underline-offset-4" href="/">
              Return to the scan console
            </Link>
          </p>
        </Panel>
      </div>
    </Layout>
  );
}
