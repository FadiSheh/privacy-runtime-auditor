import { Layout } from '../components/layout';
import { SeverityBadge } from '../components/severity-badge';
import { C, F } from '../lib/tokens';

const RULES = [
  {
    code: 'R001',
    severity: 'critical' as const,
    title: 'Non-essential tracking before consent',
    scenario: 'no-consent',
    description:
      'A tracking cookie, pixel, or script fired before the user interacted with the consent banner. The site loads third-party analytics, advertising, or behavioral SDKs during the initial page load without any consent signal. This is a direct GDPR/ePrivacy violation.',
    remediation:
      'Gate third-party script injection behind CMP callbacks. Verify with a reject-all replay that no third-party network egress occurs on page load.',
  },
  {
    code: 'R002',
    severity: 'high' as const,
    title: 'Missing consent banner',
    scenario: 'no-consent',
    description:
      'No recognizable consent mechanism was detected on the page. The crawler found no CMP overlay, cookie banner, or equivalent UI element before any user interaction.',
    remediation:
      'Implement a compliant CMP with a visible banner on all pages. The banner must present a clear accept and reject option at the first layer.',
  },
  {
    code: 'R003',
    severity: 'critical' as const,
    title: 'Ineffective reject all',
    scenario: 'reject-all',
    description:
      'Cookies or requests observed after "Reject all" that were also present after "Accept all" — rejection has no real effect. The CMP records a reject decision but third-party identifiers continue to be written to document.cookie.',
    remediation:
      'Audit CMP category assignments. Ensure all non-functional vendors are blocked when their categories are rejected. Test with a headless browser that verifies zero third-party cookie writes after rejection.',
  },
  {
    code: 'R004',
    severity: 'high' as const,
    title: 'Dark patterns in consent UX',
    scenario: 'no-consent',
    description:
      '"Reject" is harder to reach than "Accept" — extra clicks, hidden options, or pre-ticked boxes. The first banner surface contains only "Accept all" and "Manage settings", requiring two additional clicks to reject all.',
    remediation:
      'Expose a "Reject all" button at the first layer of the consent banner at equal visual prominence to "Accept all". Audit against EDPB guidelines on dark patterns.',
  },
  {
    code: 'R005',
    severity: 'high' as const,
    title: 'Policy–runtime vendor mismatch',
    scenario: 'accept-all',
    description:
      'A third-party vendor observed at runtime is not mentioned anywhere in the privacy policy. The policy-parser extracted the declared vendor list from the privacy/cookie policy URL, and cross-referenced it against runtime observations.',
    remediation:
      'Update the privacy policy and cookie appendix to list all vendors observed at runtime. Remove undisclosed vendors or add them to the policy before deployment.',
  },
  {
    code: 'R006',
    severity: 'high' as const,
    title: 'Cookie without policy disclosure',
    scenario: 'accept-all',
    description:
      'A specific cookie (by name/domain) is set at runtime but not listed in the privacy policy cookie table. The cookie may be set by a disclosed vendor but the individual cookie identifier is absent from the declared table.',
    remediation:
      'Enumerate all cookies set after accept-all and verify each is present in the cookie policy table with purpose, duration, and controller fields.',
  },
  {
    code: 'R007',
    severity: 'medium' as const,
    title: 'Rejection less effective than acceptance',
    scenario: 'reject-all',
    description:
      'Significantly fewer tracking cookies are cleared on rejection than would be expected. The delta between accept-all and reject-all cookie counts is smaller than the declared non-functional cookie count, indicating a partial opt-out.',
    remediation:
      'Compare the accept-all and reject-all cookie sets programmatically. Every non-functional cookie written after accept must be absent after reject.',
  },
  {
    code: 'R008',
    severity: 'medium' as const,
    title: 'Granular controls not persisted',
    scenario: 'granular',
    description:
      'After selecting granular consent (functional only), tracking vendors that should be off are still active. The granular scenario sets analytics=off and ads=off, but those vendor scripts continue to load and transmit data.',
    remediation:
      'Ensure CMP granular category state is correctly propagated to all vendor loading logic. Test programmatically: set functional=true, all others false, and verify no analytics/ads requests are made.',
  },
  {
    code: 'R009',
    severity: 'medium' as const,
    title: 'Storage without consent',
    scenario: 'no-consent',
    description:
      'Data written to localStorage, sessionStorage, or IndexedDB before the user consented. Even if no cookies are set, writing identifiers or behavioral data to web storage before consent is a violation.',
    remediation:
      'Audit all localStorage/sessionStorage writes and gate non-functional writes behind the CMP consent callback.',
  },
  {
    code: 'R010',
    severity: 'info' as const,
    title: 'Unexpected vendor in policy',
    scenario: 'accept-all',
    description:
      'The privacy policy names a vendor that was never observed at runtime. Not a violation, but useful for policy hygiene — the declared vendor may have been removed from the site without a corresponding policy update.',
    remediation:
      'Review whether the vendor is still deployed. If removed, update the policy. If still deployed but not observed, investigate whether it loads conditionally.',
  },
  {
    code: 'R011',
    severity: 'medium' as const,
    title: 'Consent regression from baseline',
    scenario: 'no-consent',
    description:
      'A vendor or cookie that was absent in a previous baseline scan has appeared in the current scan. This indicates a new tracking dependency was introduced since the baseline was established.',
    remediation:
      'Investigate what deployment introduced the new vendor. Review the change log and ensure the new vendor is covered by the privacy policy and CMP configuration before shipping.',
  },
  {
    code: 'R012',
    severity: 'low' as const,
    title: 'New vendor detected',
    scenario: 'accept-all',
    description:
      'A new third-party vendor appeared since the baseline was set. This is an informational finding that tracks vendor fleet changes over time without necessarily indicating a compliance failure.',
    remediation:
      'Verify the new vendor is intentional, disclosed in the privacy policy, and properly gated by the CMP.',
  },
] as const;

const SCENARIO_LABELS: Record<string, string> = {
  'no-consent': 'NO-CONSENT',
  'reject-all':  'REJECT-ALL',
  'accept-all':  'ACCEPT-ALL',
  granular:      'GRANULAR',
};

export default function RulesPage() {
  return (
    <Layout activeNav="rules">
      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 32px 96px', fontFamily: F.body }}>
        {/* Header */}
        <div style={{ borderBottom: `1px solid ${C.hairline}`, paddingBottom: 24, marginBottom: 40 }}>
          <h1 style={{ fontFamily: F.serif, fontSize: 44, fontWeight: 500, margin: 0, color: C.ink, letterSpacing: -1, lineHeight: 1 }}>
            Rule reference
          </h1>
          <p style={{ fontFamily: F.mono, fontSize: 11, color: C.slate, marginTop: 10, letterSpacing: 0.5 }}>
            12 deterministic rules · R001 – R012 · evaluated against every scan
          </p>
        </div>

        {/* Summary bar */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
          border: `1px solid ${C.hairline}`, background: C.paper, marginBottom: 48,
        }}>
          {([ 'critical', 'high', 'medium', 'low', 'info' ] as const).map((sev, i) => {
            const count = RULES.filter((r) => r.severity === sev).length;
            return (
              <div key={sev} style={{ padding: '16px 20px', borderLeft: i === 0 ? 'none' : `1px solid ${C.hairline}` }}>
                <div style={{ marginBottom: 8 }}><SeverityBadge severity={sev} size="lg" /></div>
                <div style={{ fontFamily: F.mono, fontSize: 28, fontWeight: 500, color: C.ink, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                  {count}
                </div>
                <div style={{ fontFamily: F.mono, fontSize: 10, color: C.slate60, marginTop: 4 }}>
                  rule{count !== 1 ? 's' : ''}
                </div>
              </div>
            );
          })}
        </div>

        {/* Rule list */}
        <div style={{ borderTop: `1px solid ${C.ink}` }}>
          {RULES.map((rule) => (
            <div key={rule.code} style={{ borderBottom: `1px solid ${C.hairline}`, padding: '28px 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 100px 1fr', gap: 20, alignItems: 'flex-start', marginBottom: 12 }}>
                <span style={{ fontFamily: F.mono, fontSize: 16, fontWeight: 700, color: C.ink, letterSpacing: 0.5 }}>
                  {rule.code}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <SeverityBadge severity={rule.severity} />
                  <span style={{
                    fontFamily: F.mono, fontSize: 9, fontWeight: 700, letterSpacing: 0.8,
                    color: C.slate, border: `1px solid ${C.hairline}`, padding: '2px 6px',
                    display: 'inline-block', width: 'fit-content',
                  }}>
                    {SCENARIO_LABELS[rule.scenario] ?? rule.scenario}
                  </span>
                </div>
                <div>
                  <h2 style={{ fontFamily: F.body, fontSize: 17, fontWeight: 600, margin: '0 0 10px', color: C.ink, lineHeight: 1.3 }}>
                    {rule.title}
                  </h2>
                  <p style={{ fontSize: 14, color: C.ink70, lineHeight: 1.65, margin: 0 }}>
                    {rule.description}
                  </p>
                </div>
              </div>

              <div style={{
                marginLeft: 200, borderLeft: `3px solid ${C.moss}`,
                padding: '10px 16px', background: C.mossBg + '70',
              }}>
                <div style={{ fontFamily: F.mono, fontSize: 10, color: '#1E5622', letterSpacing: 1, fontWeight: 700, marginBottom: 4 }}>
                  ☐ REMEDIATION
                </div>
                <div style={{ fontSize: 13, color: '#1E3618', lineHeight: 1.55 }}>
                  {rule.remediation}
                </div>
              </div>
            </div>
          ))}
        </div>

        <footer style={{
          marginTop: 48, paddingTop: 24, borderTop: `1px solid ${C.hairline}`,
          fontFamily: F.mono, fontSize: 10, color: C.slate60, letterSpacing: 0.5,
        }}>
          PRA RULES ENGINE · v2.6 · 12 rules · deterministic evaluation
        </footer>
      </main>
    </Layout>
  );
}
