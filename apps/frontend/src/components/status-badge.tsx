import { C, F } from '../lib/tokens';

export type BadgeStatus = 'queued' | 'running' | 'completed' | 'failed' | 'baseline';

const config: Record<BadgeStatus, { bg: string; fg: string; label: string; dot: string; pulse?: boolean; noBorder?: boolean }> = {
  queued:    { bg: C.sandDeep,  fg: C.ink,      label: 'QUEUED',    dot: C.slate60 },
  running:   { bg: C.amberBg,   fg: '#6B4D00',  label: 'RUNNING',   dot: C.amber, pulse: true },
  completed: { bg: C.mossBg,    fg: '#1E5622',  label: 'COMPLETED', dot: C.moss },
  failed:    { bg: C.rustBg,    fg: '#7A1F15',  label: 'FAILED',    dot: C.rust },
  baseline:  { bg: C.ink,       fg: C.sand,     label: 'BASELINE',  dot: C.sand, noBorder: true },
};

interface StatusBadgeProps {
  status: BadgeStatus;
  size?: 'sm' | 'lg';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const s = config[status] ?? config.queued;
  const height = size === 'lg' ? 26 : 20;
  const fontSize = size === 'lg' ? 11 : 10;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height,
      padding: '0 8px',
      background: s.bg,
      color: s.fg,
      fontFamily: F.mono,
      fontSize,
      fontWeight: 600,
      letterSpacing: 0.6,
      border: s.noBorder ? 'none' : `1px solid ${s.fg}22`,
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 6,
        height: 6,
        borderRadius: 3,
        background: s.dot,
        display: 'inline-block',
        flexShrink: 0,
        animation: s.pulse ? 'pra-pulse 1.4s ease-in-out infinite' : 'none',
      }} />
      {s.label}
    </span>
  );
}
