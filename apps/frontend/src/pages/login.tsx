import Link from 'next/link';
import { useRouter } from 'next/router';
import { FormEvent, useState } from 'react';

import { Layout } from '../components/layout';
import { C, F } from '../lib/tokens';

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
      <main style={{ maxWidth: 480, margin: '64px auto', padding: '0 32px', fontFamily: F.body }}>
        <h1 style={{ fontFamily: F.serif, fontSize: 36, fontWeight: 500, margin: '0 0 8px', color: C.ink, letterSpacing: -0.8 }}>
          Demo access
        </h1>
        <p style={{ fontFamily: F.mono, fontSize: 11, color: C.slate, letterSpacing: 0.5, marginBottom: 32 }}>
          / OPEN THE RUNTIME AUDIT CONSOLE
        </p>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="email" style={{ fontFamily: F.mono, fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: C.slate }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                height: 44, padding: '0 14px',
                background: C.paper, border: `1px solid ${C.hairlineStrong}`,
                color: C.ink, fontSize: 14, outline: 'none', fontFamily: F.body, width: '100%',
              }}
              onFocus={(e) => { e.target.style.borderColor = C.ink; e.target.style.boxShadow = `0 0 0 2px ${C.sandDeeper}`; }}
              onBlur={(e) => { e.target.style.borderColor = C.hairlineStrong; e.target.style.boxShadow = 'none'; }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="password" style={{ fontFamily: F.mono, fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: C.slate }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                height: 44, padding: '0 14px',
                background: C.paper, border: `1px solid ${C.hairlineStrong}`,
                color: C.ink, fontSize: 14, outline: 'none', fontFamily: F.body, width: '100%',
              }}
              onFocus={(e) => { e.target.style.borderColor = C.ink; e.target.style.boxShadow = `0 0 0 2px ${C.sandDeeper}`; }}
              onBlur={(e) => { e.target.style.borderColor = C.hairlineStrong; e.target.style.boxShadow = 'none'; }}
            />
          </div>
          <button
            type="submit"
            style={{
              height: 44, padding: '0 20px',
              background: C.ink, color: C.sand,
              border: `1px solid ${C.ink}`,
              fontFamily: F.mono, fontSize: 12, fontWeight: 600, letterSpacing: 0.8,
              textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            CONTINUE WITH DEMO ACCOUNT →
          </button>
        </form>

        <p style={{ marginTop: 20, fontFamily: F.mono, fontSize: 10, color: C.slate60, lineHeight: 1.6 }}>
          This MVP focuses on the core scan flow. Authentication is a lightweight demo gate for local use.
        </p>
        <p style={{ marginTop: 8, fontFamily: F.mono, fontSize: 10, color: C.slate60 }}>
          <Link href="/" style={{ color: C.rust, textDecoration: 'none', borderBottom: `1px solid ${C.rust}` }}>
            ← Return to projects
          </Link>
        </p>
      </main>
    </Layout>
  );
}
