import Link from 'next/link';
import type { PropsWithChildren, ReactNode } from 'react';

import { C, F } from '../lib/tokens';

interface LayoutProps {
  activeNav?: 'projects' | 'rules' | 'docs';
  headerRight?: ReactNode;
}

export function Layout({ children, activeNav = 'projects', headerRight }: PropsWithChildren<LayoutProps>) {
  return (
    <div style={{ background: C.sand, minHeight: '100vh', fontFamily: F.body, color: C.ink }}>
      <header style={{
        background: C.ink,
        color: C.sand,
        padding: '0 32px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        gap: 32,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.sand, textDecoration: 'none' }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <rect x="1" y="1" width="20" height="20" stroke={C.sand} strokeWidth="1.5"/>
            <path d="M5 6h12M5 11h8M5 16h5" stroke={C.sand} strokeWidth="1.5"/>
            <circle cx="17" cy="16" r="2.5" stroke={C.rust} strokeWidth="1.5" fill="none"/>
          </svg>
          <span style={{ fontFamily: F.mono, fontSize: 13, fontWeight: 700, letterSpacing: 2 }}>PRA</span>
          <span style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: 1, color: C.sandDeeper, marginLeft: -2, fontWeight: 400 }}>
            / PRIVACY · RUNTIME · AUDITOR
          </span>
        </Link>

        <nav style={{ display: 'flex', gap: 20, marginLeft: 16 }}>
          {([
            { href: '/', label: 'PROJECTS', key: 'projects' },
            { href: '/rules', label: 'RULES', key: 'rules' },
            { href: '/docs', label: 'DOCS', key: 'docs' },
          ] as const).map(({ href, label, key }) => (
            <Link
              key={key}
              href={href}
              style={{
                fontFamily: F.mono,
                fontSize: 11,
                color: key === activeNav ? C.sand : C.sandDeeper,
                textDecoration: 'none',
                letterSpacing: 1,
                fontWeight: key === activeNav ? 600 : 400,
                paddingBottom: 2,
                borderBottom: key === activeNav ? `1.5px solid ${C.rust}` : '1.5px solid transparent',
              }}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        {headerRight}

      </header>

      {children}
    </div>
  );
}

export function Breadcrumb({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav style={{ fontFamily: F.mono, fontSize: 11, color: C.slate60, display: 'flex', alignItems: 'center', gap: 8, letterSpacing: 0.5 }}>
      {items.map((item, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {i > 0 && <span style={{ color: C.slate30 }}>/</span>}
          {item.href && i < items.length - 1 ? (
            <Link href={item.href} style={{ color: C.slate60, textDecoration: 'none', borderBottom: `1px solid ${C.hairline}` }}>
              {item.label}
            </Link>
          ) : (
            <span style={{ color: i === items.length - 1 ? C.ink : C.slate60 }}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
