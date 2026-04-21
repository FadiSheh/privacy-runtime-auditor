import { C, F } from '../lib/tokens';

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

const config: Record<Severity, { bg: string; fg: string }> = {
  critical: { bg: C.rust,       fg: '#fff' },
  high:     { bg: C.orangeBg,   fg: '#6B2F00' },
  medium:   { bg: C.amberBg,    fg: '#5A4200' },
  low:      { bg: C.sandDeep,   fg: C.slate },
  info:     { bg: C.cloud,      fg: C.slate },
};

interface SeverityBadgeProps {
  severity: Severity;
  size?: 'sm' | 'lg';
}

export function SeverityBadge({ severity, size = 'sm' }: SeverityBadgeProps) {
  const s = config[severity] ?? config.info;
  const height = size === 'lg' ? 24 : 18;
  const fontSize = size === 'lg' ? 10.5 : 9.5;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      height,
      padding: '0 8px',
      background: s.bg,
      color: s.fg,
      fontFamily: F.mono,
      fontSize,
      fontWeight: 700,
      letterSpacing: 0.8,
      border: severity === 'critical' ? 'none' : `1px solid ${C.hairline}`,
      whiteSpace: 'nowrap',
    }}>
      {severity.toUpperCase()}
    </span>
  );
}
